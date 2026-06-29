import type {
  ApplicationStatus,
  JobApplicationListFilters,
  JobApplication,
  ResumeVersion
} from "../../../domain/applications.js";

export type CreateResumeVersionInput = {
  name: string;
  targetRole?: string;
  changeNotes?: string;
};

export type UpdateResumeVersionInput = Partial<CreateResumeVersionInput>;

export type CreateJobApplicationInput = {
  company: string;
  role: string;
  postingUrl?: string;
  status?: ApplicationStatus;
  deadline?: string;
  nextAction?: string;
  resumeVersionId?: string;
  notes?: string;
};

export type UpdateJobApplicationInput = Partial<{
  company: string;
  role: string;
  postingUrl: string;
  status: ApplicationStatus;
  deadline: string;
  nextAction: string;
  resumeVersionId: string;
  notes: string;
}>;

export interface ApplicationRepository {
  listJobApplications(filters?: JobApplicationListFilters): Promise<JobApplication[]>;
  createJobApplication(input: CreateJobApplicationInput): Promise<JobApplication>;
  updateJobApplication(
    id: string,
    input: UpdateJobApplicationInput
  ): Promise<JobApplication | null>;
  listResumeVersions(): Promise<ResumeVersion[]>;
  createResumeVersion(input: CreateResumeVersionInput): Promise<ResumeVersion>;
  updateResumeVersion(id: string, input: UpdateResumeVersionInput): Promise<ResumeVersion | null>;
}
