import { Router } from "express";
import type { AssistantResponse } from "../../domain/assistant.js";
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
  projectRepository: ProjectRepository
): Router {
  const router = Router();

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
