import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AssistantActionService } from "../server/assistant/action-service.js";
import { PrismaApplicationRepository } from "../server/storage/repositories/prisma-applications.js";
import { PrismaProjectRepository } from "../server/storage/repositories/prisma-projects.js";
import { PrismaSprintRepository } from "../server/storage/repositories/prisma-sprints.js";
import { PrismaStudyRepository } from "../server/storage/repositories/prisma-study.js";
import { prisma } from "../server/storage/prisma.js";

const sourceTypeSchema = z
  .enum(["study", "application", "project", "sprint", "personal"])
  .optional();
const messageRoleSchema = z.enum(["user", "assistant", "system"]);

const actionService = new AssistantActionService(prisma);
const sprintRepository = new PrismaSprintRepository(prisma);
const applicationRepository = new PrismaApplicationRepository(prisma);
const studyRepository = new PrismaStudyRepository(prisma);
const projectRepository = new PrismaProjectRepository(prisma);

const server = new McpServer(
  {
    name: "personal-assistant",
    version: "0.1.0"
  },
  {
    instructions: [
      "Use this server as the state bridge for the personal assistant app.",
      "Codex CLI is the primary conversation surface; the web app is a status and approval dashboard.",
      "Call get_workspace_snapshot before planning from app data.",
      "Call log_assistant_event to record important CLI conversation notes, decisions, or summaries.",
      "Never apply a calendar action unless the action status is already approved.",
      "Prefer create_calendar_event_draft and delete_calendar_event_draft for calendar changes.",
      "Return action ids to the user so the web status board can show approval controls."
    ].join(" ")
  }
);

server.registerTool(
  "ensure_assistant_conversation",
  {
    title: "Ensure assistant conversation",
    description: "Create an assistant conversation if the supplied id does not already exist.",
    inputSchema: {
      conversationId: z.string().optional(),
      title: z.string().optional()
    }
  },
  async (input) => {
    const conversation = await actionService.ensureConversation(input.conversationId, input.title);
    return toToolResult({
      message: "Assistant conversation is ready.",
      conversation
    });
  }
);

server.registerTool(
  "get_workspace_snapshot",
  {
    title: "Get personal assistant workspace snapshot",
    description:
      "Load current sprint, job follow-up, study, project, and tracked assistant action state for Codex CLI planning.",
    inputSchema: {
      conversationId: z.string().optional(),
      includeActions: z.boolean().default(true)
    }
  },
  async (input) => {
    const [sprint, applications, resumeVersions, studyItems, projects, actions] =
      await Promise.all([
        sprintRepository.getActiveSprint(),
        applicationRepository.listJobApplications(),
        applicationRepository.listResumeVersions(),
        studyRepository.listStudyItems(),
        projectRepository.listProjects(),
        input.includeActions ? actionService.listActions(input.conversationId) : Promise.resolve([])
      ]);

    return toToolResult({
      message: "Workspace snapshot loaded.",
      generatedAt: new Date().toISOString(),
      snapshot: {
        sprint,
        applications,
        resumeVersions,
        studyItems,
        projects,
        actions
      }
    });
  }
);

server.registerTool(
  "log_assistant_event",
  {
    title: "Log CLI assistant event",
    description:
      "Record a Codex CLI conversation note, decision, or summary so the web dashboard can display assistant state.",
    inputSchema: {
      conversationId: z.string().optional(),
      title: z.string().optional(),
      role: messageRoleSchema.default("assistant"),
      content: z.string().min(1)
    }
  },
  async (input) => {
    const conversation = await actionService.ensureConversation(input.conversationId, input.title);
    const message = await actionService.addMessage({
      conversationId: conversation.id,
      role: input.role,
      content: input.content
    });

    return toToolResult({
      message: "Assistant event logged.",
      conversation,
      assistantMessage: message
    });
  }
);

server.registerTool(
  "create_calendar_event_draft",
  {
    title: "Create Google Calendar event draft",
    description:
      "Create a tracked draft for a Google Calendar event. This does not write to Google Calendar until the user approves and applies the action.",
    inputSchema: {
      conversationId: z.string().min(1),
      summary: z.string().min(1),
      description: z.string().optional(),
      startDateTime: z.string().datetime({ offset: true }),
      endDateTime: z.string().datetime({ offset: true }),
      timeZone: z.string().min(1).default("Asia/Seoul"),
      sourceType: sourceTypeSchema,
      sourceId: z.string().optional()
    }
  },
  async (input) => {
    const action = await actionService.createCalendarEventDraft(input);
    return toToolResult({
      message: "Calendar event draft created.",
      action
    });
  }
);

server.registerTool(
  "delete_calendar_event_draft",
  {
    title: "Create Google Calendar delete draft",
    description:
      "Create a tracked draft for deleting a Google Calendar event. This does not delete anything until the user approves and applies the action.",
    inputSchema: {
      conversationId: z.string().min(1),
      externalEventId: z.string().min(1),
      provider: z.string().optional(),
      calendarId: z.string().optional(),
      summary: z.string().optional()
    }
  },
  async (input) => {
    const action = await actionService.createDeleteCalendarEventDraft(input);
    return toToolResult({
      message: "Calendar delete draft created.",
      action
    });
  }
);

server.registerTool(
  "list_calendar_actions",
  {
    title: "List tracked calendar actions",
    description: "List tracked calendar actions, optionally scoped to one assistant conversation.",
    inputSchema: {
      conversationId: z.string().optional()
    }
  },
  async (input) => {
    const actions = await actionService.listActions(input.conversationId);
    return toToolResult({
      message: "Tracked calendar actions loaded.",
      actions
    });
  }
);

server.registerTool(
  "apply_approved_calendar_action",
  {
    title: "Apply approved calendar action",
    description:
      "Apply a tracked calendar action only if it has already been approved by the user in the web status board.",
    inputSchema: {
      actionId: z.string().min(1)
    }
  },
  async (input) => {
    const action = await actionService.applyAction(input.actionId);
    return toToolResult({
      message: "Calendar action apply attempted.",
      action
    });
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

function toToolResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}
