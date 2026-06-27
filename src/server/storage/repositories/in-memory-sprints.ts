import type { Sprint, WorkItem, WorkItemStatus } from "../../../domain/sprint.js";
import type {
  CreateSprintInput,
  CreateWorkItemInput,
  SprintRepository
} from "./sprint-repository.js";

export class InMemorySprintRepository implements SprintRepository {
  private sprints = new Map<string, Sprint>();
  private workItems = new Map<string, WorkItem>();
  private nextId = 1;

  async getActiveSprint(): Promise<Sprint | null> {
    const sprint = [...this.sprints.values()].find((candidate) => candidate.isActive);
    return sprint ? this.withWorkItems(sprint) : null;
  }

  async createSprint(input: CreateSprintInput): Promise<Sprint> {
    for (const sprint of this.sprints.values()) {
      this.sprints.set(sprint.id, { ...sprint, isActive: false });
    }

    const sprint: Sprint = {
      id: this.createId("sprint"),
      name: input.name,
      goal: input.goal,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      capacity: input.capacity,
      isActive: true,
      workItems: []
    };

    this.sprints.set(sprint.id, sprint);
    return sprint;
  }

  async createWorkItem(input: CreateWorkItemInput): Promise<WorkItem> {
    const workItem: WorkItem = {
      id: this.createId("work"),
      sprintId: input.sprintId,
      title: input.title,
      description: input.description,
      status: input.status ?? "backlog",
      area: input.area,
      dueDate: input.dueDate,
      priority: input.priority,
      blocker: input.blocker
    };

    this.workItems.set(workItem.id, workItem);
    return workItem;
  }

  async updateWorkItemStatus(id: string, status: WorkItemStatus): Promise<WorkItem> {
    const workItem = this.workItems.get(id);

    if (!workItem) {
      throw new Error(`Work item not found: ${id}`);
    }

    const updated = { ...workItem, status };
    this.workItems.set(id, updated);
    return updated;
  }

  private withWorkItems(sprint: Sprint): Sprint {
    return {
      ...sprint,
      workItems: [...this.workItems.values()].filter((item) => item.sprintId === sprint.id)
    };
  }

  private createId(prefix: string): string {
    const id = `${prefix}-${this.nextId}`;
    this.nextId += 1;
    return id;
  }
}
