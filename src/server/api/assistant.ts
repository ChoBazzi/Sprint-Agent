import { Router } from "express";
import { z } from "zod";
import type { AssistantResponse } from "../../domain/assistant.js";
import {
  AssistantActionError,
  AssistantActionService
} from "../assistant/action-service.js";
import { runAssistantChat } from "../assistant/chat-runner.js";
import { createCodexDailyPlan } from "../assistant/codex-assistant.js";
import { createStubDailyPlan, type DailyPlanContext } from "../assistant/prompt-builders.js";
import {
  assistantReviewRequestSchema,
  dailyPlanRequestSchema
} from "../assistant/schemas.js";
import type { ApplicationRepository } from "../storage/repositories/application-repository.js";
import type { ProjectRepository } from "../storage/repositories/project-repository.js";
import type { SprintRepository } from "../storage/repositories/sprint-repository.js";
import type { StudyRepository } from "../storage/repositories/study-repository.js";

export function createAssistantRouter(
  sprintRepository: SprintRepository,
  applicationRepository: ApplicationRepository,
  studyRepository: StudyRepository,
  projectRepository: ProjectRepository,
  actionService: AssistantActionService
): Router {
  const router = Router();

  router.get("/assistant/conversations", async (_request, response, next) => {
    try {
      response.json({ data: await actionService.listConversations() });
    } catch (error) {
      next(error);
    }
  });

  router.post("/assistant/conversations", async (request, response, next) => {
    try {
      const input = createConversationSchema.parse(request.body);
      response.status(201).json({ data: await actionService.createConversation(input) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/assistant/conversations/:id", async (request, response, next) => {
    try {
      response.json({ data: await actionService.getConversationDetail(request.params.id) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/assistant/conversations/:id/messages", async (request, response, next) => {
    try {
      const input = sendMessageSchema.parse(request.body);
      const conversation = await actionService.ensureConversation(request.params.id, input.title);
      const beforeDetail = await actionService.getConversationDetail(conversation.id);
      const userMessage = await actionService.addMessage({
        conversationId: conversation.id,
        role: "user",
        content: input.content
      });
      const context = await loadDailyPlanContext({
        sprintRepository,
        applicationRepository,
        studyRepository,
        projectRepository,
        date: todayDateOnly(),
        userInstruction: input.content
      });

      const assistantText = await runAssistantChat({
        conversationId: conversation.id,
        userMessage: input.content,
        history: [...beforeDetail.messages, userMessage],
        context
      });
      const assistantMessage = await actionService.addMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: assistantText
      });
      const detail = await actionService.getConversationDetail(conversation.id);

      response.status(201).json({
        data: {
          ...detail,
          assistantMessage
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/assistant/actions/:id/approve", async (request, response, next) => {
    try {
      response.json({ data: await actionService.approveAction(request.params.id) });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/assistant/actions/:id/reject", async (request, response, next) => {
    try {
      response.json({ data: await actionService.rejectAction(request.params.id) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/assistant/actions/:id/apply", async (request, response, next) => {
    try {
      response.json({ data: await actionService.applyAction(request.params.id) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/assistant/daily-plan", async (request, response, next) => {
    try {
      const input = dailyPlanRequestSchema.parse(request.body);
      const context = await loadDailyPlanContext({
        sprintRepository,
        applicationRepository,
        studyRepository,
        projectRepository,
        date: input.date,
        userInstruction: input.userInstruction
      });
      response.json({
        data: await createAssistantPlan(context)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/assistant/sprint-review", async (request, response, next) => {
    try {
      const input = assistantReviewRequestSchema.parse(request.body);
      const context = await loadDailyPlanContext({
        sprintRepository,
        applicationRepository,
        studyRepository,
        projectRepository,
        date: todayDateOnly(),
        userInstruction: input.userInstruction ?? "현재 Sprint를 리뷰하고 범위 조정을 제안해줘."
      });

      response.json({ data: await createAssistantPlan(context) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/assistant/application-review", async (request, response, next) => {
    try {
      const input = assistantReviewRequestSchema.parse(request.body);
      const context = await loadDailyPlanContext({
        sprintRepository,
        applicationRepository,
        studyRepository,
        projectRepository,
        date: todayDateOnly(),
        userInstruction:
          input.userInstruction ??
          `지원건 ${input.applicationId ?? "전체"}의 다음 액션과 이력서 준비 상태를 리뷰해줘.`
      });

      response.json({ data: await createAssistantPlan(context) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/assistant/project-review", async (request, response, next) => {
    try {
      const input = assistantReviewRequestSchema.parse(request.body);
      const context = await loadDailyPlanContext({
        sprintRepository,
        applicationRepository,
        studyRepository,
        projectRepository,
        date: todayDateOnly(),
        userInstruction:
          input.userInstruction ??
          `프로젝트 ${input.projectId ?? "전체"}의 포트폴리오 완성도를 리뷰해줘.`
      });

      response.json({ data: await createAssistantPlan(context) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

const createConversationSchema = z.object({
  title: z.string().trim().min(1).optional()
});

const sendMessageSchema = z.object({
  title: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).max(4000)
});

type LoadContextInput = {
  sprintRepository: SprintRepository;
  applicationRepository: ApplicationRepository;
  studyRepository: StudyRepository;
  projectRepository: ProjectRepository;
  date: string;
  userInstruction?: string;
};

async function loadDailyPlanContext(input: LoadContextInput): Promise<DailyPlanContext> {
  const [sprint, applications, resumeVersions, studyItems, projects] = await Promise.all([
    input.sprintRepository.getActiveSprint(),
    input.applicationRepository.listJobApplications(),
    input.applicationRepository.listResumeVersions(),
    input.studyRepository.listStudyItems(),
    input.projectRepository.listProjects()
  ]);

  return {
    date: input.date,
    userInstruction: input.userInstruction,
    sprint,
    applications,
    resumeVersions,
    studyItems,
    projects
  };
}

async function createAssistantPlan(context: DailyPlanContext): Promise<AssistantResponse> {
  if (process.env.AI_ASSISTANT_MODE !== "codex") {
    return createStubDailyPlan(context);
  }

  try {
    return await createCodexDailyPlan(context);
  } catch (error) {
    const fallback = createStubDailyPlan(context);
    return {
      ...fallback,
      warnings: [
        ...fallback.warnings,
        `Codex mode failed; returned local fallback. ${formatError(error)}`
      ]
    };
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toAssistantApiError(error: unknown) {
  if (error instanceof AssistantActionError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  return null;
}
