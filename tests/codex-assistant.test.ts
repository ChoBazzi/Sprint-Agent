import { describe, expect, it } from "vitest";
import {
  buildCodexCliArgs,
  createCodexDailyPlan
} from "../src/server/assistant/codex-assistant";

describe("createCodexDailyPlan", () => {
  it("builds a prompt and validates the Codex JSON response", async () => {
    const response = await createCodexDailyPlan(
      {
        date: "2026-06-29",
        sprint: null,
        applications: [
          {
            id: "application-1",
            company: "Wanted Labs",
            role: "Backend Developer",
            status: "preparing",
            deadline: "2026-06-30"
          }
        ],
        resumeVersions: [],
        studyItems: [],
        projects: []
      },
      {
        runCodex: async ({ prompt }) => {
          expect(prompt).toContain("Wanted Labs");
          return JSON.stringify({
            summary: "지원 마감을 먼저 처리하세요.",
            suggestions: [
              {
                id: "codex-1",
                title: "Wanted Labs 지원 마감 대응",
                rationale: "마감이 가까워 오늘 처리해야 합니다.",
                suggestedActions: ["공고 요구사항과 이력서를 대조하세요."],
                affectedItemIds: ["application-1"],
                confidence: "high"
              }
            ],
            warnings: []
          });
        }
      }
    );

    expect(response.suggestions[0].id).toBe("codex-1");
  });

  it("accepts a fenced JSON response", async () => {
    const response = await createCodexDailyPlan(
      {
        date: "2026-06-29",
        sprint: null,
        applications: [],
        resumeVersions: [],
        studyItems: [],
        projects: []
      },
      {
        runCodex: async () => `\`\`\`json
{
  "summary": "오늘 계획입니다.",
  "suggestions": [],
  "warnings": []
}
\`\`\``
      }
    );

    expect(response.summary).toBe("오늘 계획입니다.");
  });

  it("rejects responses outside the assistant schema", async () => {
    await expect(
      createCodexDailyPlan(
        {
          date: "2026-06-29",
          sprint: null,
          applications: [],
          resumeVersions: [],
          studyItems: [],
          projects: []
        },
        {
          runCodex: async () => JSON.stringify({ summary: "missing fields" })
        }
      )
    ).rejects.toThrow("Codex response did not match the assistant schema.");
  });

  it("places approval policy before the exec subcommand for the Codex CLI", () => {
    expect(
      buildCodexCliArgs({
        cwd: "/repo",
        outputPath: "/tmp/daily-plan.json",
        prompt: "Return JSON."
      })
    ).toEqual([
      "--ask-for-approval",
      "never",
      "exec",
      "--sandbox",
      "read-only",
      "--ephemeral",
      "--cd",
      "/repo",
      "--output-last-message",
      "/tmp/daily-plan.json",
      "Return JSON."
    ]);
  });
});
