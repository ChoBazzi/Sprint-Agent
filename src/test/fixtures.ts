import type { WorkItem } from "../domain/sprint";

export function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: "work-1",
    title: "알고리즘 문제 풀이",
    status: "planned",
    area: "study",
    priority: 2,
    sprintId: "sprint-1",
    ...overrides
  };
}
