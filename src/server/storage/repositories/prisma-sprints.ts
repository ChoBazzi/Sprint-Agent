import type { PrismaClient } from "@prisma/client";
import { WorkItemStatus as PrismaWorkItemStatus } from "@prisma/client";
import type { Sprint, WorkArea, WorkItem, WorkItemStatus } from "../../../domain/sprint.js";
import type {
  CreateSprintInput,
  CreateWorkItemInput,
  PatchWorkItemInput,
  SprintRepository
} from "./sprint-repository.js";

type PrismaSprintWithWorkItems = Awaited<
  ReturnType<PrismaClient["sprint"]["findFirst"]>
> & {
  workItems?: Awaited<ReturnType<PrismaClient["workItem"]["findMany"]>>;
};

export class PrismaSprintRepository implements SprintRepository {
  constructor(private readonly db: PrismaClient) {}

  async getActiveSprint(): Promise<Sprint | null> {
    const sprint = await this.db.sprint.findFirst({
      where: { isActive: true },
      include: { workItems: { orderBy: [{ status: "asc" }, { createdAt: "asc" }] } }
    });

    return sprint ? toSprint(sprint) : null;
  }

  async createSprint(input: CreateSprintInput): Promise<Sprint> {
    const sprint = await this.db.$transaction(async (transaction) => {
      await transaction.sprint.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });

      return transaction.sprint.create({
        data: {
          name: input.name,
          goal: input.goal,
          startsOn: toDate(input.startsOn),
          endsOn: toDate(input.endsOn),
          capacity: input.capacity,
          isActive: true
        },
        include: { workItems: true }
      });
    });

    return toSprint(sprint);
  }

  async createWorkItem(input: CreateWorkItemInput): Promise<WorkItem> {
    const workItem = await this.db.workItem.create({
      data: {
        sprintId: input.sprintId,
        title: input.title,
        description: input.description,
        status: toPrismaWorkItemStatus(input.status ?? "backlog"),
        area: input.area,
        dueDate: "dueDate" in input ? (input.dueDate ? toDate(input.dueDate) : null) : undefined,
        estimate: input.estimate,
        priority: input.priority,
        blocker: input.blocker
      }
    });

    return toWorkItem(workItem);
  }

  async updateWorkItemStatus(id: string, status: WorkItemStatus): Promise<WorkItem> {
    return this.patchWorkItem(id, { status });
  }

  async patchWorkItem(id: string, input: PatchWorkItemInput): Promise<WorkItem> {
    const workItem = await this.db.workItem.update({
      where: { id },
      data: {
        sprintId: input.sprintId,
        title: input.title,
        description: input.description,
        status: input.status ? toPrismaWorkItemStatus(input.status) : undefined,
        area: input.area,
        dueDate: input.dueDate ? toDate(input.dueDate) : undefined,
        estimate: input.estimate,
        priority: input.priority,
        blocker: input.blocker
      }
    });

    return toWorkItem(workItem);
  }

  async deleteWorkItem(id: string): Promise<void> {
    await this.db.workItem.delete({ where: { id } });
  }
}

function toSprint(sprint: NonNullable<PrismaSprintWithWorkItems>): Sprint {
  return {
    id: sprint.id,
    name: sprint.name,
    goal: sprint.goal,
    startsOn: toDateOnly(sprint.startsOn),
    endsOn: toDateOnly(sprint.endsOn),
    capacity: sprint.capacity ?? undefined,
    isActive: sprint.isActive,
    workItems: (sprint.workItems ?? []).map(toWorkItem)
  };
}

function toWorkItem(workItem: {
  id: string;
  sprintId: string | null;
  title: string;
  description: string | null;
  status: PrismaWorkItemStatus;
  area: string;
  dueDate: Date | null;
  estimate: number | null;
  priority: number;
  blocker: string | null;
}): WorkItem {
  return {
    id: workItem.id,
    sprintId: workItem.sprintId ?? undefined,
    title: workItem.title,
    description: workItem.description ?? undefined,
    status: fromPrismaWorkItemStatus(workItem.status),
    area: workItem.area as WorkArea,
    dueDate: workItem.dueDate ? toDateOnly(workItem.dueDate) : undefined,
    priority: toDomainPriority(workItem.priority),
    blocker: workItem.blocker ?? undefined
  };
}

function toPrismaWorkItemStatus(status: WorkItemStatus): PrismaWorkItemStatus {
  const map: Record<WorkItemStatus, PrismaWorkItemStatus> = {
    backlog: PrismaWorkItemStatus.BACKLOG,
    planned: PrismaWorkItemStatus.PLANNED,
    in_progress: PrismaWorkItemStatus.IN_PROGRESS,
    blocked: PrismaWorkItemStatus.BLOCKED,
    done: PrismaWorkItemStatus.DONE,
    skipped: PrismaWorkItemStatus.SKIPPED
  };

  return map[status];
}

function fromPrismaWorkItemStatus(status: PrismaWorkItemStatus): WorkItemStatus {
  const map: Record<PrismaWorkItemStatus, WorkItemStatus> = {
    BACKLOG: "backlog",
    PLANNED: "planned",
    IN_PROGRESS: "in_progress",
    BLOCKED: "blocked",
    DONE: "done",
    SKIPPED: "skipped"
  };

  return map[status];
}

function toDomainPriority(priority: number): 1 | 2 | 3 {
  if (priority <= 1) {
    return 1;
  }

  if (priority >= 3) {
    return 3;
  }

  return 2;
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
