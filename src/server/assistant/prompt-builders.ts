import type { AssistantResponse } from "../../domain/assistant.js";
import type { JobApplication, ResumeVersion } from "../../domain/applications.js";
import {
  getApplicationsMissingNextAction,
  getDueSoonApplications
} from "../../domain/applications.js";
import type { PortfolioProject } from "../../domain/projects.js";
import type { StudyItem } from "../../domain/study.js";
import type { Sprint, WorkItem } from "../../domain/sprint.js";
import { getDailyRecommendations, type DailyRecommendation } from "../../domain/recommendations.js";

export type DailyPlanContext = {
  date: string;
  userInstruction?: string;
  sprint: Sprint | null;
  applications: JobApplication[];
  resumeVersions: ResumeVersion[];
  studyItems?: StudyItem[];
  projects?: PortfolioProject[];
};

export function buildDailyPlanPrompt(context: DailyPlanContext): string {
  const sprintBlock = context.sprint
    ? [
        `Active Sprint: ${context.sprint.name}`,
        `Goal: ${context.sprint.goal}`,
        `Range: ${context.sprint.startsOn} - ${context.sprint.endsOn}`,
        "Work items:",
        ...context.sprint.workItems.map(formatWorkItem)
      ].join("\n")
    : "Active Sprint: none";
  const applicationBlock =
    context.applications.length > 0
      ? [
          "Job applications:",
          ...context.applications.map(formatJobApplication)
        ].join("\n")
      : "Job applications: none";
  const resumeVersionBlock =
    context.resumeVersions.length > 0
      ? [
          "Resume versions:",
          ...context.resumeVersions.map(formatResumeVersion)
        ].join("\n")
      : "Resume versions: none";
  const studyItems = context.studyItems ?? [];
  const studyBlock =
    studyItems.length > 0
      ? ["Study items:", ...studyItems.map(formatStudyItem)].join("\n")
      : "Study items: none";
  const projects = context.projects ?? [];
  const projectBlock =
    projects.length > 0
      ? ["Portfolio projects:", ...projects.map(formatPortfolioProject)].join("\n")
      : "Portfolio projects: none";

  return [
    "You are a planning assistant for a Korean developer job seeker.",
    "Create a realistic daily plan using only the provided data.",
    "Do not claim to apply changes. Return suggestions for review only.",
    `Date: ${context.date}`,
    `User instruction: ${redactSecrets(context.userInstruction ?? "none")}`,
    sprintBlock,
    applicationBlock,
    resumeVersionBlock,
    studyBlock,
    projectBlock,
    "Return structured suggestions with title, rationale, concrete actions, affected item IDs, and confidence."
  ].join("\n\n");
}

export function createStubDailyPlan(context: DailyPlanContext): AssistantResponse {
  const today = new Date(`${context.date}T00:00:00.000Z`);
  const dueApplications = getDueSoonApplications(context.applications, today, 3);
  const missingNextActionApplications = getApplicationsMissingNextAction(context.applications);
  const applicationSuggestions = [
    ...dueApplications.slice(0, 2).map((application, index) => ({
      id: `stub-application-due-${index + 1}`,
      title: `${application.company} 지원 마감 대응`,
      rationale: application.deadline
        ? `${application.deadline} 마감이라 오늘 제출 가능 상태까지 좁혀야 합니다.`
        : "지원 마감이 가까워 우선순위를 높였습니다.",
      suggestedActions: [
        application.nextAction
          ? application.nextAction
          : "공고 요구사항과 이력서 버전을 대조하고 제출 전 체크리스트를 만드세요."
      ],
      affectedItemIds: [application.id],
      confidence: "high" as const
    })),
    ...missingNextActionApplications
      .filter((application) => !dueApplications.some((due) => due.id === application.id))
      .slice(0, 1)
      .map((application, index) => ({
        id: `stub-application-action-${index + 1}`,
        title: `${application.company} 다음 액션 정하기`,
        rationale: "활성 지원건에 다음 행동이 없으면 추적은 되지만 실행으로 이어지기 어렵습니다.",
        suggestedActions: ["다음 행동을 1개로 정하고 Sprint 작업으로 연결하세요."],
        affectedItemIds: [application.id],
        confidence: "medium" as const
      }))
  ];
  const studySuggestions = getDueSoonStudyItems(context.studyItems ?? [], today)
    .slice(0, Math.max(0, 3 - applicationSuggestions.length))
    .map((studyItem, index) => ({
      id: `stub-study-${index + 1}`,
      title: `${studyItem.topic} 공부 진행`,
      rationale: studyItem.targetDate
        ? `${studyItem.targetDate} 목표라 오늘 진도를 올려야 합니다.`
        : "계획된 공부 항목이라 Sprint 작업과 함께 처리할 수 있습니다.",
      suggestedActions: [
        studyItem.progress < 70
          ? "핵심 개념 3개를 정리하고 예상 면접 질문으로 바꾸세요."
          : "복습 질문을 만들고 모르는 부분만 다시 표시하세요."
      ],
      affectedItemIds: [studyItem.id],
      confidence: "medium" as const
    }));
  const projectSuggestions = getActivePortfolioProjects(context.projects ?? [])
    .slice(0, Math.max(0, 3 - applicationSuggestions.length - studySuggestions.length))
    .map((project, index) => ({
      id: `stub-project-${index + 1}`,
      title: `${project.name} 포트폴리오 보강`,
      rationale: project.nextAction
        ? "포트폴리오 프로젝트에 바로 실행할 다음 액션이 있습니다."
        : "포트폴리오 준비도가 아직 완료되지 않았습니다.",
      suggestedActions: [
        project.nextAction ?? "README, 배포, 테스트 중 비어 있는 항목 하나를 오늘 완료하세요."
      ],
      affectedItemIds: [project.id],
      confidence: "medium" as const
    }));
  const recommendations = getDailyRecommendations(
    context.sprint?.workItems ?? [],
    today
  ).slice(
    0,
    Math.max(0, 3 - applicationSuggestions.length - studySuggestions.length - projectSuggestions.length)
  );
  const workSuggestions = recommendations.map((recommendation: DailyRecommendation, index: number) => ({
    id: `stub-daily-plan-${index + 1}`,
    title: recommendation.item.title,
    rationale: formatReasons(recommendation.reasons),
    suggestedActions: [formatAction(recommendation.item)],
    affectedItemIds: [recommendation.item.id],
    confidence: recommendation.score >= 50 ? ("high" as const) : ("medium" as const)
  }));
  const suggestions = [
    ...applicationSuggestions,
    ...studySuggestions,
    ...projectSuggestions,
    ...workSuggestions
  ].slice(0, 3);

  if (suggestions.length === 0) {
    return {
      summary: "오늘 계획을 만들기 위한 Sprint 작업이 아직 부족합니다.",
      suggestions: [
        {
          id: "stub-create-sprint-work",
          title: "오늘 처리할 Sprint 작업 1개 추가",
          rationale: "Daily plan은 실제 작업 목록이 있을 때 우선순위를 더 정확히 잡을 수 있습니다.",
          suggestedActions: ["Sprint Board에서 오늘 처리할 작업을 하나 추가하세요."],
          affectedItemIds: [],
          confidence: "medium"
        }
      ],
      warnings: ["Stub mode: Codex 호출 없이 로컬 규칙으로 생성했습니다."]
    };
  }

  return {
    summary:
      applicationSuggestions.length > 0
        ? "지원 마감과 Sprint 상태를 기준으로 오늘 집중할 작업을 추렸습니다."
        : studySuggestions.length > 0 || projectSuggestions.length > 0
          ? "공부 목표와 포트폴리오 준비도를 기준으로 오늘 집중할 작업을 추렸습니다."
        : "현재 Sprint 상태를 기준으로 오늘 집중할 작업을 추렸습니다.",
    suggestions,
    warnings: ["Stub mode: Codex 호출 없이 로컬 규칙으로 생성했습니다."]
  };
}

function formatWorkItem(item: WorkItem): string {
  const dueDate = item.dueDate ? `, due ${item.dueDate}` : "";
  const blocker = item.blocker ? `, blocker: ${redactSecrets(item.blocker)}` : "";
  return `- ${item.id}: ${redactSecrets(item.title)} [${item.area}, ${item.status}, priority ${item.priority}${dueDate}${blocker}]`;
}

function formatJobApplication(application: JobApplication): string {
  const deadline = application.deadline ? `, deadline ${application.deadline}` : "";
  const nextAction = application.nextAction
    ? `, next action: ${redactSecrets(application.nextAction)}`
    : ", next action: none";
  const resume = application.resumeVersionName
    ? `, resume: ${redactSecrets(application.resumeVersionName)}`
    : "";
  return `- ${application.id}: ${redactSecrets(application.company)} ${redactSecrets(application.role)} [${application.status}${deadline}${nextAction}${resume}]`;
}

function formatResumeVersion(resumeVersion: ResumeVersion): string {
  const targetRole = resumeVersion.targetRole
    ? `, target role: ${redactSecrets(resumeVersion.targetRole)}`
    : "";
  const changeNotes = resumeVersion.changeNotes
    ? `, changes: ${redactSecrets(resumeVersion.changeNotes)}`
    : "";
  return `- ${resumeVersion.id}: ${redactSecrets(resumeVersion.name)} [${targetRole}${changeNotes}]`;
}

function formatStudyItem(studyItem: StudyItem): string {
  const targetDate = studyItem.targetDate ? `, target ${studyItem.targetDate}` : "";
  const reviewDate = studyItem.reviewDate ? `, review ${studyItem.reviewDate}` : "";
  return `- ${studyItem.id}: ${redactSecrets(studyItem.topic)} [${studyItem.status}, progress ${studyItem.progress}%${targetDate}${reviewDate}]`;
}

function formatPortfolioProject(project: PortfolioProject): string {
  const nextAction = project.nextAction
    ? `, next action: ${redactSecrets(project.nextAction)}`
    : "";
  return `- ${project.id}: ${redactSecrets(project.name)} [${project.status}, ready ${project.portfolioReady}, readme ${project.hasReadme}, demo ${project.hasDemo}, deploy ${project.hasDeployment}, tests ${project.hasTests}${nextAction}]`;
}

function getDueSoonStudyItems(studyItems: StudyItem[], today: Date): StudyItem[] {
  return studyItems
    .filter((studyItem) => studyItem.status !== "done")
    .filter((studyItem) => studyItem.targetDate && isWithinDays(studyItem.targetDate, today, 3))
    .sort((a, b) => {
      const aTargetDate = a.targetDate ?? "";
      const bTargetDate = b.targetDate ?? "";
      return aTargetDate.localeCompare(bTargetDate) || a.topic.localeCompare(b.topic);
    });
}

function getActivePortfolioProjects(projects: PortfolioProject[]): PortfolioProject[] {
  return projects
    .filter((project) => project.status !== "archived" && !project.portfolioReady)
    .sort((a, b) => scoreProjectReadiness(a) - scoreProjectReadiness(b) || a.name.localeCompare(b.name));
}

function scoreProjectReadiness(project: PortfolioProject): number {
  return [project.hasReadme, project.hasDemo, project.hasDeployment, project.hasTests].filter(Boolean).length;
}

function formatReasons(reasons: string[]): string {
  if (reasons.includes("due_soon")) {
    return "마감이 가까워 오늘 우선순위가 높습니다.";
  }

  if (reasons.includes("in_progress")) {
    return "이미 진행 중인 작업이라 전환 비용이 낮습니다.";
  }

  if (reasons.includes("blocked")) {
    return "막힌 작업은 먼저 unblock 액션을 잡아야 합니다.";
  }

  return "현재 Sprint에 계획된 작업입니다.";
}

function formatAction(item: WorkItem): string {
  if (item.status === "blocked") {
    return item.blocker
      ? `Blocker를 해결하기 위한 다음 행동을 정하세요: ${redactSecrets(item.blocker)}`
      : "Blocker 원인을 한 줄로 정리하고 다음 행동을 정하세요.";
  }

  if (item.dueDate) {
    return `${item.dueDate} 마감 전에 완료 가능한 최소 단위로 쪼개세요.`;
  }

  return "30분 타임박스로 시작하고 끝난 뒤 상태를 업데이트하세요.";
}

function redactSecrets(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/(OPENAI_API_KEY|CODEX_API_KEY)\s*=\s*\S+/gi, "$1=[redacted]");
}

function isWithinDays(dateValue: string, today: Date, days: number): boolean {
  const target = startOfDay(new Date(dateValue));
  const base = startOfDay(today);
  const diffDays = (target.getTime() - base.getTime()) / (24 * 60 * 60 * 1000);

  return diffDays >= 0 && diffDays <= days;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
