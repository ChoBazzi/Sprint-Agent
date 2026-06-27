import { describe, expect, it } from "vitest";
import { getDailyRecommendations } from "../src/domain/recommendations";
import { makeWorkItem } from "../src/test/fixtures";

describe("getDailyRecommendations", () => {
  const today = new Date("2026-06-24T09:00:00+09:00");

  it("prioritizes due-soon work over ordinary planned work", () => {
    const recommendations = getDailyRecommendations(
      [
        makeWorkItem({ id: "later", title: "다음 주 README 정리", dueDate: "2026-07-02" }),
        makeWorkItem({ id: "soon", title: "오늘 지원 마감", dueDate: "2026-06-25" })
      ],
      today
    );

    expect(recommendations[0].item.id).toBe("soon");
    expect(recommendations[0].reasons).toContain("due_soon");
  });

  it("excludes completed and skipped work", () => {
    const recommendations = getDailyRecommendations(
      [
        makeWorkItem({ id: "done", status: "done" }),
        makeWorkItem({ id: "skipped", status: "skipped" }),
        makeWorkItem({ id: "active", status: "in_progress" })
      ],
      today
    );

    expect(recommendations.map((item) => item.item.id)).toEqual(["active"]);
  });

  it("surfaces blocked work as an unblocking recommendation", () => {
    const recommendations = getDailyRecommendations(
      [makeWorkItem({ id: "blocked", status: "blocked", blocker: "API 설계 미정" })],
      today
    );

    expect(recommendations[0].reasons).toContain("blocked");
    expect(recommendations[0].score).toBeGreaterThan(0);
  });
});
