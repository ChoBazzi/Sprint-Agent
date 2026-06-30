import type {
  AssistantAction,
  AssistantActionStatus,
  AssistantActionType,
  AssistantConversation,
  AssistantConversationDetail,
  AssistantMessage,
  AssistantMessageRole
} from "../../domain/assistant-chat.js";
import { isValidCalendarRange, type CalendarEventDraft } from "../../domain/calendar.js";
import {
  GoogleCalendarService,
  type GoogleCalendarConfig
} from "../calendar/google-calendar.js";
import type { Prisma, PrismaClient } from "@prisma/client";

type CreateConversationInput = {
  title?: string;
};

type AddMessageInput = {
  conversationId: string;
  role: AssistantMessageRole;
  content: string;
};

export type CreateCalendarActionDraftInput = CalendarEventDraft & {
  conversationId: string;
};

export type DeleteCalendarActionDraftInput = {
  conversationId: string;
  externalEventId: string;
  provider?: string;
  calendarId?: string;
  summary?: string;
};

type AssistantActionServiceOptions = {
  calendarService?: GoogleCalendarService;
  calendarConfig?: GoogleCalendarConfig;
};

export class AssistantActionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

export class AssistantActionService {
  private readonly calendarService: GoogleCalendarService;

  constructor(
    private readonly prisma: PrismaClient,
    options: AssistantActionServiceOptions = {}
  ) {
    this.calendarService =
      options.calendarService ?? new GoogleCalendarService({ config: options.calendarConfig });
  }

  async listConversations(): Promise<AssistantConversation[]> {
    const conversations = await this.prisma.assistantConversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20
    });
    return conversations.map(toConversation);
  }

  async createConversation(input: CreateConversationInput = {}): Promise<AssistantConversation> {
    const conversation = await this.prisma.assistantConversation.create({
      data: {
        title: normalizeTitle(input.title)
      }
    });
    return toConversation(conversation);
  }

  async ensureConversation(id?: string, title?: string): Promise<AssistantConversation> {
    if (id) {
      const existing = await this.prisma.assistantConversation.findUnique({ where: { id } });
      if (existing) {
        return toConversation(existing);
      }
    }
    return this.createConversation({ title });
  }

  async getConversationDetail(id: string): Promise<AssistantConversationDetail> {
    const conversation = await this.prisma.assistantConversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        actions: { orderBy: { createdAt: "desc" } }
      }
    });

    if (!conversation) {
      throw new AssistantActionError("ASSISTANT_CONVERSATION_NOT_FOUND", "Conversation not found.", 404);
    }

    return {
      conversation: toConversation(conversation),
      messages: conversation.messages.map(toMessage),
      actions: conversation.actions.map(toAction)
    };
  }

  async addMessage(input: AddMessageInput): Promise<AssistantMessage> {
    await this.assertConversation(input.conversationId);
    const message = await this.prisma.assistantMessage.create({
      data: {
        conversationId: input.conversationId,
        role: toPrismaMessageRole(input.role),
        content: input.content
      }
    });
    await this.touchConversation(input.conversationId);
    return toMessage(message);
  }

  async createCalendarEventDraft(input: CreateCalendarActionDraftInput): Promise<AssistantAction> {
    await this.assertConversation(input.conversationId);
    if (!isValidCalendarRange(input)) {
      throw new AssistantActionError(
        "INVALID_CALENDAR_EVENT_RANGE",
        "Calendar event end time must be after the start time.",
        422
      );
    }

    const action = await this.prisma.assistantAction.create({
      data: {
        conversationId: input.conversationId,
        type: "CREATE_CALENDAR_EVENT",
        status: "PROPOSED",
        summary: input.summary,
        description: input.description,
        startDateTime: new Date(input.startDateTime),
        endDateTime: new Date(input.endDateTime),
        timeZone: input.timeZone,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        provider: "google",
        payload: input as unknown as Prisma.InputJsonValue
      }
    });
    await this.touchConversation(input.conversationId);
    return toAction(action);
  }

  async createDeleteCalendarEventDraft(input: DeleteCalendarActionDraftInput): Promise<AssistantAction> {
    await this.assertConversation(input.conversationId);
    const action = await this.prisma.assistantAction.create({
      data: {
        conversationId: input.conversationId,
        type: "DELETE_CALENDAR_EVENT",
        status: "PROPOSED",
        summary: input.summary,
        provider: input.provider ?? "google",
        calendarId: input.calendarId,
        externalEventId: input.externalEventId,
        payload: input as unknown as Prisma.InputJsonValue
      }
    });
    await this.touchConversation(input.conversationId);
    return toAction(action);
  }

  async listActions(conversationId?: string): Promise<AssistantAction[]> {
    const actions = await this.prisma.assistantAction.findMany({
      where: conversationId ? { conversationId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return actions.map(toAction);
  }

  async approveAction(id: string): Promise<AssistantAction> {
    const action = await this.getActionRecord(id);
    if (action.status !== "PROPOSED") {
      throw new AssistantActionError("INVALID_ACTION_STATE", "Only proposed actions can be approved.", 409);
    }
    return this.updateActionStatus(id, "approved");
  }

  async rejectAction(id: string): Promise<AssistantAction> {
    const action = await this.getActionRecord(id);
    if (action.status !== "PROPOSED" && action.status !== "APPROVED") {
      throw new AssistantActionError("INVALID_ACTION_STATE", "Only proposed or approved actions can be rejected.", 409);
    }
    return this.updateActionStatus(id, "rejected");
  }

  async applyAction(id: string): Promise<AssistantAction> {
    const action = await this.getActionRecord(id);
    if (action.status !== "APPROVED") {
      throw new AssistantActionError("ACTION_NOT_APPROVED", "Approve the action before applying it.", 409);
    }

    try {
      const applied =
        action.type === "CREATE_CALENDAR_EVENT"
          ? await this.applyCreateCalendarAction(action)
          : await this.applyDeleteCalendarAction(action);
      await this.touchConversation(action.conversationId);
      return applied;
    } catch (error) {
      const failed = await this.prisma.assistantAction.update({
        where: { id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown error."
        }
      });
      return toAction(failed);
    }
  }

  private async applyCreateCalendarAction(action: PrismaAssistantAction): Promise<AssistantAction> {
    if (!action.summary || !action.startDateTime || !action.endDateTime || !action.timeZone) {
      throw new AssistantActionError(
        "INCOMPLETE_CALENDAR_ACTION",
        "Create calendar action is missing required fields.",
        422
      );
    }

    const result = await this.calendarService.createEvent({
      summary: action.summary,
      description: action.description ?? undefined,
      startDateTime: action.startDateTime.toISOString(),
      endDateTime: action.endDateTime.toISOString(),
      timeZone: action.timeZone,
      sourceType: action.sourceType as CalendarEventDraft["sourceType"],
      sourceId: action.sourceId ?? undefined
    });

    await this.prisma.calendarEventLink.create({
      data: {
        provider: result.provider,
        calendarId: result.calendarId,
        externalEventId: result.eventId,
        sourceType: action.sourceType,
        sourceId: action.sourceId,
        summary: action.summary,
        startDateTime: action.startDateTime,
        endDateTime: action.endDateTime,
        status: "ACTIVE",
        actionId: action.id
      }
    });

    const updated = await this.prisma.assistantAction.update({
      where: { id: action.id },
      data: {
        status: "APPLIED",
        provider: result.provider,
        calendarId: result.calendarId,
        externalEventId: result.eventId,
        result: result as unknown as Prisma.InputJsonValue,
        error: null
      }
    });
    return toAction(updated);
  }

  private async applyDeleteCalendarAction(action: PrismaAssistantAction): Promise<AssistantAction> {
    if (!action.externalEventId) {
      throw new AssistantActionError(
        "INCOMPLETE_CALENDAR_ACTION",
        "Delete calendar action is missing an event id.",
        422
      );
    }

    await this.calendarService.deleteEvent({ eventId: action.externalEventId });

    await this.prisma.calendarEventLink.updateMany({
      where: {
        provider: action.provider ?? "google",
        externalEventId: action.externalEventId
      },
      data: { status: "DELETED", actionId: action.id }
    });

    const updated = await this.prisma.assistantAction.update({
      where: { id: action.id },
      data: {
        status: "APPLIED",
        error: null,
        result: { deleted: true, eventId: action.externalEventId }
      }
    });
    return toAction(updated);
  }

  private async updateActionStatus(id: string, status: AssistantActionStatus): Promise<AssistantAction> {
    const action = await this.prisma.assistantAction.update({
      where: { id },
      data: { status: toPrismaActionStatus(status) }
    });
    await this.touchConversation(action.conversationId);
    return toAction(action);
  }

  private async getActionRecord(id: string): Promise<PrismaAssistantAction> {
    const action = await this.prisma.assistantAction.findUnique({ where: { id } });
    if (!action) {
      throw new AssistantActionError("ASSISTANT_ACTION_NOT_FOUND", "Assistant action not found.", 404);
    }
    return action;
  }

  private async assertConversation(id: string): Promise<void> {
    const conversation = await this.prisma.assistantConversation.findUnique({ where: { id } });
    if (!conversation) {
      throw new AssistantActionError("ASSISTANT_CONVERSATION_NOT_FOUND", "Conversation not found.", 404);
    }
  }

  private async touchConversation(id: string): Promise<void> {
    await this.prisma.assistantConversation.update({
      where: { id },
      data: { updatedAt: new Date() }
    });
  }
}

type PrismaConversation = Awaited<ReturnType<PrismaClient["assistantConversation"]["create"]>>;
type PrismaMessage = Awaited<ReturnType<PrismaClient["assistantMessage"]["create"]>>;
type PrismaAssistantAction = Awaited<ReturnType<PrismaClient["assistantAction"]["create"]>>;

function toConversation(conversation: PrismaConversation): AssistantConversation {
  return {
    id: conversation.id,
    title: conversation.title,
    codexSessionId: conversation.codexSessionId ?? undefined,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString()
  };
}

function toMessage(message: PrismaMessage): AssistantMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role.toLowerCase() as AssistantMessageRole,
    content: message.content,
    createdAt: message.createdAt.toISOString()
  };
}

function toAction(action: PrismaAssistantAction): AssistantAction {
  return {
    id: action.id,
    conversationId: action.conversationId,
    type: action.type.toLowerCase() as AssistantActionType,
    status: action.status.toLowerCase() as AssistantActionStatus,
    summary: action.summary ?? undefined,
    description: action.description ?? undefined,
    startDateTime: action.startDateTime?.toISOString(),
    endDateTime: action.endDateTime?.toISOString(),
    timeZone: action.timeZone ?? undefined,
    sourceType: action.sourceType ?? undefined,
    sourceId: action.sourceId ?? undefined,
    provider: action.provider ?? undefined,
    calendarId: action.calendarId ?? undefined,
    externalEventId: action.externalEventId ?? undefined,
    error: action.error ?? undefined,
    createdAt: action.createdAt.toISOString(),
    updatedAt: action.updatedAt.toISOString()
  };
}

function toPrismaMessageRole(role: AssistantMessageRole) {
  return role.toUpperCase() as "USER" | "ASSISTANT" | "SYSTEM";
}

function toPrismaActionStatus(status: AssistantActionStatus) {
  return status.toUpperCase() as "PROPOSED" | "APPROVED" | "APPLIED" | "REJECTED" | "FAILED";
}

function normalizeTitle(title?: string): string {
  const normalized = title?.trim();
  return normalized ? normalized.slice(0, 80) : "새 대화";
}
