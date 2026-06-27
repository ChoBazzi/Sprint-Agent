import type { WorkItem } from "./sprint.js";

export type RecommendationReason =
  | "due_soon"
  | "in_progress"
  | "blocked"
  | "planned_sprint_work";

export type DailyRecommendation = {
  item: WorkItem;
  reasons: RecommendationReason[];
  score: number;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function getDailyRecommendations(
  items: WorkItem[],
  today: Date
): DailyRecommendation[] {
  return items
    .filter((item) => item.status !== "done" && item.status !== "skipped")
    .map((item) => scoreWorkItem(item, today))
    .filter((recommendation) => recommendation.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
}

function scoreWorkItem(item: WorkItem, today: Date): DailyRecommendation {
  const reasons: RecommendationReason[] = [];
  let score = 0;

  if (item.dueDate && isWithinDays(item.dueDate, today, 3)) {
    reasons.push("due_soon");
    score += 50;
  }

  if (item.status === "in_progress") {
    reasons.push("in_progress");
    score += 30;
  }

  if (item.status === "blocked") {
    reasons.push("blocked");
    score += item.blocker ? 20 : 10;
  }

  if (item.status === "planned" && item.sprintId) {
    reasons.push("planned_sprint_work");
    score += 15;
  }

  score += item.priority * 5;

  return { item, reasons, score };
}

function isWithinDays(dateValue: string, today: Date, days: number): boolean {
  const target = startOfDay(new Date(dateValue));
  const base = startOfDay(today);
  const diffDays = (target.getTime() - base.getTime()) / DAY_IN_MS;

  return diffDays >= 0 && diffDays <= days;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
