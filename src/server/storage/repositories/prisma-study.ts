import type { PrismaClient } from "@prisma/client";
import { StudyStatus as PrismaStudyStatus } from "@prisma/client";
import type { StudyItem, StudyStatus } from "../../../domain/study.js";
import type {
  CreateStudyItemInput,
  PatchStudyItemInput,
  StudyRepository
} from "./study-repository.js";

export class PrismaStudyRepository implements StudyRepository {
  constructor(private readonly db: PrismaClient) {}

  async listStudyItems(): Promise<StudyItem[]> {
    const studyItems = await this.db.studyItem.findMany({
      orderBy: [{ targetDate: "asc" }, { updatedAt: "desc" }]
    });

    return studyItems.map(toStudyItem);
  }

  async createStudyItem(input: CreateStudyItemInput): Promise<StudyItem> {
    const studyItem = await this.db.studyItem.create({
      data: {
        topic: input.topic,
        resource: input.resource,
        targetDate:
          "targetDate" in input ? (input.targetDate ? toDate(input.targetDate) : null) : undefined,
        estimatedHours: input.estimatedHours,
        progress: input.progress,
        status: toPrismaStudyStatus(input.status ?? "backlog"),
        reviewDate:
          "reviewDate" in input ? (input.reviewDate ? toDate(input.reviewDate) : null) : undefined
      }
    });

    return toStudyItem(studyItem);
  }

  async patchStudyItem(id: string, input: PatchStudyItemInput): Promise<StudyItem> {
    const studyItem = await this.db.studyItem.update({
      where: { id },
      data: {
        topic: input.topic,
        resource: input.resource,
        targetDate: input.targetDate ? toDate(input.targetDate) : undefined,
        estimatedHours: input.estimatedHours,
        progress: input.progress,
        status: input.status ? toPrismaStudyStatus(input.status) : undefined,
        reviewDate: input.reviewDate ? toDate(input.reviewDate) : undefined
      }
    });

    return toStudyItem(studyItem);
  }
}

function toStudyItem(studyItem: {
  id: string;
  topic: string;
  resource: string | null;
  targetDate: Date | null;
  estimatedHours: number | null;
  progress: number;
  status: PrismaStudyStatus;
  reviewDate: Date | null;
}): StudyItem {
  return {
    id: studyItem.id,
    topic: studyItem.topic,
    resource: studyItem.resource ?? undefined,
    targetDate: studyItem.targetDate ? toDateOnly(studyItem.targetDate) : undefined,
    estimatedHours: studyItem.estimatedHours ?? undefined,
    progress: studyItem.progress,
    status: fromPrismaStudyStatus(studyItem.status),
    reviewDate: studyItem.reviewDate ? toDateOnly(studyItem.reviewDate) : undefined
  };
}

function toPrismaStudyStatus(status: StudyStatus): PrismaStudyStatus {
  const map: Record<StudyStatus, PrismaStudyStatus> = {
    backlog: PrismaStudyStatus.BACKLOG,
    planned: PrismaStudyStatus.PLANNED,
    in_progress: PrismaStudyStatus.IN_PROGRESS,
    reviewing: PrismaStudyStatus.REVIEWING,
    done: PrismaStudyStatus.DONE
  };

  return map[status];
}

function fromPrismaStudyStatus(status: PrismaStudyStatus): StudyStatus {
  const map: Record<PrismaStudyStatus, StudyStatus> = {
    BACKLOG: "backlog",
    PLANNED: "planned",
    IN_PROGRESS: "in_progress",
    REVIEWING: "reviewing",
    DONE: "done"
  };

  return map[status];
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
