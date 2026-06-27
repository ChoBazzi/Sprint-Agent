import { describe, expect, it } from "vitest";
import { createSprintService } from "../src/server/services/sprint-service";
import { InMemorySprintRepository } from "../src/server/storage/repositories/in-memory-sprints";

describe("SprintService", () => {
  it("creates an active sprint and returns it with empty work items", async () => {
    const service = createSprintService(new InMemorySprintRepository());

    const sprint = await service.createSprint({
      name: "6월 4주차 Sprint",
      goal: "지원 루틴과 알고리즘 학습 안정화",
      startsOn: "2026-06-24",
      endsOn: "2026-06-30",
      capacity: 20
    });

    expect(sprint.isActive).toBe(true);
    expect(sprint.workItems).toEqual([]);
  });

  it("creates work items in the active sprint", async () => {
    const service = createSprintService(new InMemorySprintRepository());
    const sprint = await service.createSprint({
      name: "Sprint",
      goal: "MVP 만들기",
      startsOn: "2026-06-24",
      endsOn: "2026-06-30"
    });

    const workItem = await service.createWorkItem({
      sprintId: sprint.id,
      title: "Daily Command Center 와이어프레임",
      area: "project",
      priority: 3,
      status: "planned"
    });

    const activeSprint = await service.getActiveSprint();

    expect(workItem.status).toBe("planned");
    expect(activeSprint?.workItems).toHaveLength(1);
    expect(activeSprint?.workItems[0].title).toBe("Daily Command Center 와이어프레임");
  });

  it("updates work item status", async () => {
    const service = createSprintService(new InMemorySprintRepository());
    const sprint = await service.createSprint({
      name: "Sprint",
      goal: "MVP 만들기",
      startsOn: "2026-06-24",
      endsOn: "2026-06-30"
    });
    const workItem = await service.createWorkItem({
      sprintId: sprint.id,
      title: "Prisma repository 구현",
      area: "project",
      priority: 2,
      status: "planned"
    });

    const updated = await service.updateWorkItemStatus(workItem.id, "in_progress");

    expect(updated.status).toBe("in_progress");
  });
});
