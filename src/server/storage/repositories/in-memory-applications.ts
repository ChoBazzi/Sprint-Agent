import {
  filterJobApplications,
  type JobApplication,
  type JobApplicationListFilters,
  type ResumeVersion
} from "../../../domain/applications.js";
import type {
  ApplicationRepository,
  CreateJobApplicationInput,
  CreateResumeVersionInput,
  UpdateResumeVersionInput,
  UpdateJobApplicationInput
} from "./application-repository.js";

export class InMemoryApplicationRepository implements ApplicationRepository {
  private applications = new Map<string, JobApplication>();
  private resumeVersions = new Map<string, ResumeVersion>();
  private nextId = 1;

  async listJobApplications(filters: JobApplicationListFilters = {}): Promise<JobApplication[]> {
    const applications = [...this.applications.values()].map((application) =>
      this.withResumeVersionName(application)
    );

    return filterJobApplications(applications, filters);
  }

  async createJobApplication(input: CreateJobApplicationInput): Promise<JobApplication> {
    const application: JobApplication = {
      id: this.createId("application"),
      company: input.company,
      role: input.role,
      postingUrl: input.postingUrl,
      status: input.status ?? "interested",
      deadline: input.deadline,
      nextAction: input.nextAction,
      resumeVersionId: input.resumeVersionId,
      resumeVersionName: input.resumeVersionId
        ? this.resumeVersions.get(input.resumeVersionId)?.name
        : undefined,
      notes: input.notes
    };

    this.applications.set(application.id, application);
    return application;
  }

  async updateJobApplication(
    id: string,
    input: UpdateJobApplicationInput
  ): Promise<JobApplication | null> {
    const application = this.applications.get(id);

    if (!application) {
      return null;
    }

    const updated: JobApplication = { ...application };

    if ("company" in input) updated.company = input.company ?? updated.company;
    if ("role" in input) updated.role = input.role ?? updated.role;
    if ("postingUrl" in input) updated.postingUrl = input.postingUrl;
    if ("status" in input) updated.status = input.status ?? updated.status;
    if ("deadline" in input) updated.deadline = input.deadline;
    if ("nextAction" in input) updated.nextAction = input.nextAction;
    if ("resumeVersionId" in input) updated.resumeVersionId = input.resumeVersionId;
    if ("notes" in input) updated.notes = input.notes;

    this.applications.set(id, updated);
    return this.withResumeVersionName(updated);
  }

  async listResumeVersions(): Promise<ResumeVersion[]> {
    return [...this.resumeVersions.values()];
  }

  async createResumeVersion(input: CreateResumeVersionInput): Promise<ResumeVersion> {
    const resumeVersion: ResumeVersion = {
      id: this.createId("resume"),
      name: input.name,
      targetRole: input.targetRole,
      changeNotes: input.changeNotes
    };

    this.resumeVersions.set(resumeVersion.id, resumeVersion);
    return resumeVersion;
  }

  async updateResumeVersion(
    id: string,
    input: UpdateResumeVersionInput
  ): Promise<ResumeVersion | null> {
    const resumeVersion = this.resumeVersions.get(id);

    if (!resumeVersion) {
      return null;
    }

    const updated = { ...resumeVersion, ...input };
    this.resumeVersions.set(id, updated);
    return updated;
  }

  private createId(prefix: string): string {
    const id = `${prefix}-${this.nextId}`;
    this.nextId += 1;
    return id;
  }

  private withResumeVersionName(application: JobApplication): JobApplication {
    return {
      ...application,
      resumeVersionName: application.resumeVersionId
        ? this.resumeVersions.get(application.resumeVersionId)?.name
        : undefined
    };
  }
}
