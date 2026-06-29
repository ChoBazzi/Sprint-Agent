import { describe, expect, it } from "vitest";
import { assistantResponseSchema, dailyPlanRequestSchema } from "../src/server/assistant/schemas";
import { buildDailyPlanPrompt, createStubDailyPlan } from "../src/server/assistant/prompt-builders";
import { makeWorkItem } from "../src/test/fixtures";

describe("assistant schemas", () => {
  it("accepts a daily plan request with date and optional instruction", () => {
    const parsed = dailyPlanRequestSchema.parse({
      date: "2026-06-28",
      userInstruction: "면접 준비를 우선해줘"
    });

    expect(parsed.date).toBe("2026-06-28");
  });

  it("validates assistant responses", () => {
    const parsed = assistantResponseSchema.parse({
      summary: "오늘은 진행 중인 작업 하나에 집중하세요.",
      suggestions: [
        {
          id: "suggestion-1",
          title: "In Progress 작업 마무리",
          rationale: "진행 중인 작업은 전환 비용이 낮습니다.",
          suggestedActions: ["30분 타임박스로 마무리하기"],
          affectedItemIds: ["work-1"],
          confidence: "high"
        }
      ],
      warnings: []
    });

    expect(parsed.suggestions[0].confidence).toBe("high");
  });
});

describe("buildDailyPlanPrompt", () => {
  it("includes active sprint, work item, and application context", () => {
    const prompt = buildDailyPlanPrompt({
      date: "2026-06-28",
      userInstruction: "지원 마감이 있으면 먼저 알려줘",
      sprint: {
        id: "sprint-1",
        name: "6월 마지막 Sprint",
        goal: "지원 루틴 안정화",
        startsOn: "2026-06-24",
        endsOn: "2026-06-30",
        isActive: true,
        workItems: [
          makeWorkItem({
            id: "work-1",
            title: "원티드 지원서 정리",
            area: "application",
            status: "planned",
            dueDate: "2026-06-29"
          })
        ]
      },
      applications: [
        {
          id: "application-1",
          company: "Wanted Labs",
          role: "Backend Developer",
          status: "preparing",
          deadline: "2026-06-29",
          nextAction: "맞춤 이력서 제출",
          resumeVersionName: "백엔드 지원용 v1"
        }
      ],
      resumeVersions: [
        {
          id: "resume-1",
          name: "백엔드 지원용 v1",
          targetRole: "Backend Developer"
        }
      ],
      studyItems: [
        {
          id: "study-1",
          topic: "네트워크 면접 질문",
          status: "planned",
          targetDate: "2026-06-29",
          progress: 20
        }
      ],
      projects: [
        {
          id: "project-1",
          name: "Job Prep Assistant",
          goal: "취업 준비 루틴 관리",
          status: "active",
          nextAction: "README 사용 흐름 작성",
          hasReadme: false,
          hasDemo: false,
          hasDeployment: false,
          hasTests: true,
          portfolioReady: false
        }
      ]
    });

    expect(prompt).toContain("6월 마지막 Sprint");
    expect(prompt).toContain("원티드 지원서 정리");
    expect(prompt).toContain("Wanted Labs");
    expect(prompt).toContain("백엔드 지원용 v1");
    expect(prompt).toContain("네트워크 면접 질문");
    expect(prompt).toContain("Job Prep Assistant");
    expect(prompt).toContain("지원 마감이 있으면 먼저 알려줘");
  });

  it("does not include known secret-like values", () => {
    const prompt = buildDailyPlanPrompt({
      date: "2026-06-28",
      userInstruction: "OPENAI_API_KEY=test-secret-value",
      sprint: null,
      applications: [],
      resumeVersions: [],
      studyItems: [],
      projects: []
    });

    expect(prompt).not.toContain("test-secret-value");
    expect(prompt).toContain("[redacted]");
  });
});

describe("createStubDailyPlan", () => {
  it("returns reviewable suggestions without mutating user data", () => {
    const response = createStubDailyPlan({
      date: "2026-06-28",
      sprint: {
        id: "sprint-1",
        name: "Sprint",
        goal: "MVP",
        startsOn: "2026-06-24",
        endsOn: "2026-06-30",
        isActive: true,
        workItems: [makeWorkItem({ id: "work-1", status: "in_progress" })]
      },
      applications: [],
      resumeVersions: [],
      studyItems: [],
      projects: []
    });

    expect(response.suggestions[0].affectedItemIds).toEqual(["work-1"]);
    expect(response.warnings).toContain("Stub mode: Codex 호출 없이 로컬 규칙으로 생성했습니다.");
  });

  it("prioritizes due applications and missing next actions", () => {
    const response = createStubDailyPlan({
      date: "2026-06-28",
      sprint: null,
      applications: [
        {
          id: "application-1",
          company: "Wanted Labs",
          role: "Backend Developer",
          status: "preparing",
          deadline: "2026-06-29"
        }
      ],
      resumeVersions: [],
      studyItems: [],
      projects: []
    });

    expect(response.summary).toContain("지원");
    expect(response.suggestions[0].affectedItemIds).toEqual(["application-1"]);
    expect(response.suggestions[0].title).toContain("Wanted Labs");
  });

  it("uses study and project context when no application is urgent", () => {
    const response = createStubDailyPlan({
      date: "2026-06-28",
      sprint: null,
      applications: [],
      resumeVersions: [],
      studyItems: [
        {
          id: "study-1",
          topic: "운영체제 면접 정리",
          status: "planned",
          targetDate: "2026-06-29",
          progress: 10
        }
      ],
      projects: [
        {
          id: "project-1",
          name: "Portfolio API",
          goal: "백엔드 포트폴리오",
          status: "active",
          nextAction: "배포 URL 추가",
          hasReadme: true,
          hasDemo: false,
          hasDeployment: false,
          hasTests: true,
          portfolioReady: false
        }
      ]
    });

    expect(response.summary).toContain("공부");
    expect(response.suggestions.map((suggestion) => suggestion.affectedItemIds[0])).toEqual([
      "study-1",
      "project-1"
    ]);
  });
});
