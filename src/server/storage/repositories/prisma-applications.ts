import type { Prisma, PrismaClient } from "@prisma/client";
import { ApplicationStatus as PrismaApplicationStatus } from "@prisma/client";
import type {
  ApplicationStatus,
  JobApplicationListFilters,
  JobApplication,
  ResumeVersion
} from "../../../domain/applications.js";
import type {
  ApplicationRepository,
  CreateJobApplicationInput,
  CreateResumeVersionInput,
  UpdateResumeVersionInput,
  UpdateJobApplicationInput
} from "./application-repository.js";

type PrismaJobApplication = Awaited<
  ReturnType<PrismaClient["jobApplication"]["findFirst"]>
> & {
  resumeVersion?: {
    id: string;
    name: string;
    targetRole: string | null;
    changeNotes: string | null;
  } | null;
};

export class PrismaApplicationRepository implements ApplicationRepository {
  constructor(private readonly db: PrismaClient) {}

  async listJobApplications(filters: JobApplicationListFilters = {}): Promise<JobApplication[]> {
    const hasFilters =
      Boolean(filters.status) ||
      typeof filters.dueWithinDays === "number" ||
      filters.missingNextAction === true;
    const applications = await this.db.jobApplication.findMany({
      where: toJobApplicationWhere(filters),
      include: { resumeVersion: true },
      orderBy: hasFilters
        ? [{ deadline: "asc" }, { company: "asc" }, { id: "asc" }]
        : [{ deadline: "asc" }, { updatedAt: "desc" }]
    });

    return applications.map(toJobApplication);
  }

  async createJobApplication(input: CreateJobApplicationInput): Promise<JobApplication> {
    const application = await this.db.jobApplication.create({
      data: {
        company: input.company,
        role: input.role,
        postingUrl: input.postingUrl,
        status: toPrismaApplicationStatus(input.status ?? "interested"),
        deadline: input.deadline ? toDate(input.deadline) : undefined,
        nextAction: input.nextAction,
        resumeVersionId: input.resumeVersionId,
        notes: input.notes
      },
      include: { resumeVersion: true }
    });

    return toJobApplication(application);
  }

  async updateJobApplication(
    id: string,
    input: UpdateJobApplicationInput
  ): Promise<JobApplication | null> {
    const existing = await this.db.jobApplication.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      return null;
    }

    const data: Prisma.JobApplicationUncheckedUpdateInput = {};

    if ("company" in input && input.company !== undefined) data.company = input.company;
    if ("role" in input && input.role !== undefined) data.role = input.role;
    if ("postingUrl" in input) data.postingUrl = input.postingUrl ?? null;
    if ("status" in input && input.status !== undefined) {
      data.status = toPrismaApplicationStatus(input.status);
    }
    if ("deadline" in input) data.deadline = input.deadline ? toDate(input.deadline) : null;
    if ("nextAction" in input) data.nextAction = input.nextAction ?? null;
    if ("resumeVersionId" in input) data.resumeVersionId = input.resumeVersionId ?? null;
    if ("notes" in input) data.notes = input.notes ?? null;

    const application = await this.db.jobApplication.update({
      where: { id },
      data,
      include: { resumeVersion: true }
    });

    return toJobApplication(application);
  }

  async listResumeVersions(): Promise<ResumeVersion[]> {
    const resumeVersions = await this.db.resumeVersion.findMany({
      orderBy: { updatedAt: "desc" }
    });

    return resumeVersions.map(toResumeVersion);
  }

  async createResumeVersion(input: CreateResumeVersionInput): Promise<ResumeVersion> {
    const resumeVersion = await this.db.resumeVersion.create({
      data: {
        name: input.name,
        targetRole: input.targetRole,
        changeNotes: input.changeNotes
      }
    });

    return toResumeVersion(resumeVersion);
  }

  async updateResumeVersion(
    id: string,
    input: UpdateResumeVersionInput
  ): Promise<ResumeVersion | null> {
    const existing = await this.db.resumeVersion.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      return null;
    }

    const resumeVersion = await this.db.resumeVersion.update({
      where: { id },
      data: {
        name: input.name,
        targetRole: input.targetRole,
        changeNotes: input.changeNotes
      }
    });

    return toResumeVersion(resumeVersion);
  }
}

function toJobApplicationWhere(filters: JobApplicationListFilters): Prisma.JobApplicationWhereInput {
  const and: Prisma.JobApplicationWhereInput[] = [];

  if (filters.status) {
    and.push({ status: toPrismaApplicationStatus(filters.status) });
  }

  if (filters.missingNextAction === true) {
    and.push(activeApplicationWhere());
    and.push({
      OR: [{ nextAction: null }, { nextAction: "" }]
    });
  }

  if (typeof filters.dueWithinDays === "number") {
    const today = startOfDay(filters.today ?? new Date());
    const deadlineEnd = addDays(today, filters.dueWithinDays);

    and.push(activeApplicationWhere());
    and.push({
      deadline: {
        gte: toDate(toLocalDateOnly(today)),
        lte: toDate(toLocalDateOnly(deadlineEnd))
      }
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

function activeApplicationWhere(): Prisma.JobApplicationWhereInput {
  return {
    status: {
      notIn: [
        PrismaApplicationStatus.OFFER,
        PrismaApplicationStatus.REJECTED,
        PrismaApplicationStatus.ARCHIVED
      ]
    }
  };
}

function toJobApplication(application: NonNullable<PrismaJobApplication>): JobApplication {
  return {
    id: application.id,
    company: application.company,
    role: application.role,
    postingUrl: application.postingUrl ?? undefined,
    status: fromPrismaApplicationStatus(application.status),
    deadline: application.deadline ? toDateOnly(application.deadline) : undefined,
    nextAction: application.nextAction ?? undefined,
    resumeVersionId: application.resumeVersionId ?? undefined,
    resumeVersionName: application.resumeVersion?.name,
    notes: application.notes ?? undefined
  };
}

function toResumeVersion(resumeVersion: {
  id: string;
  name: string;
  targetRole: string | null;
  changeNotes: string | null;
}): ResumeVersion {
  return {
    id: resumeVersion.id,
    name: resumeVersion.name,
    targetRole: resumeVersion.targetRole ?? undefined,
    changeNotes: resumeVersion.changeNotes ?? undefined
  };
}

function toPrismaApplicationStatus(status: ApplicationStatus): PrismaApplicationStatus {
  const map: Record<ApplicationStatus, PrismaApplicationStatus> = {
    interested: PrismaApplicationStatus.INTERESTED,
    preparing: PrismaApplicationStatus.PREPARING,
    applied: PrismaApplicationStatus.APPLIED,
    coding_test: PrismaApplicationStatus.CODING_TEST,
    interview: PrismaApplicationStatus.INTERVIEW,
    offer: PrismaApplicationStatus.OFFER,
    rejected: PrismaApplicationStatus.REJECTED,
    archived: PrismaApplicationStatus.ARCHIVED
  };

  return map[status];
}

function fromPrismaApplicationStatus(status: PrismaApplicationStatus): ApplicationStatus {
  const map: Record<PrismaApplicationStatus, ApplicationStatus> = {
    INTERESTED: "interested",
    PREPARING: "preparing",
    APPLIED: "applied",
    CODING_TEST: "coding_test",
    INTERVIEW: "interview",
    OFFER: "offer",
    REJECTED: "rejected",
    ARCHIVED: "archived"
  };

  return map[status];
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toLocalDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}
