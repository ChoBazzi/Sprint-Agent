import type { AssistantResponse, DailyPlanRequest } from "../domain/assistant";
import type {
  CalendarEventDraft,
  CalendarExportResult,
  CalendarProviderStatus
} from "../domain/calendar";
import type {
  ApplicationStatus,
  JobApplication,
  ResumeVersion
} from "../domain/applications";
import type { PortfolioProject, ProjectStatus } from "../domain/projects";
import type { StudyItem, StudyStatus } from "../domain/study";
import type { Sprint, WorkArea, WorkItem, WorkItemStatus } from "../domain/sprint";

type ApiResult<T> = {
  data: T;
};

export type CreateSprintPayload = {
  name: string;
  goal: string;
  startsOn: string;
  endsOn: string;
  capacity?: number;
};

export type CreateWorkItemPayload = {
  sprintId?: string;
  title: string;
  area: WorkArea;
  priority: 1 | 2 | 3;
  status?: WorkItemStatus;
  dueDate?: string;
};

export type PatchWorkItemPayload = Partial<{
  title: string;
  area: WorkArea;
  priority: 1 | 2 | 3;
  status: WorkItemStatus;
  dueDate: string;
  blocker: string;
}>;

export type CreateResumeVersionPayload = {
  name: string;
  targetRole?: string;
  changeNotes?: string;
};

export type UpdateResumeVersionPayload = Partial<CreateResumeVersionPayload>;

export type CreateJobApplicationPayload = {
  company: string;
  role: string;
  postingUrl?: string;
  status?: ApplicationStatus;
  deadline?: string;
  nextAction?: string;
  resumeVersionId?: string;
  notes?: string;
};

export type JobApplicationListParams = {
  status?: ApplicationStatus;
  dueWithinDays?: number;
  missingNextAction?: boolean;
};

export type UpdateJobApplicationPayload = Partial<{
  company: string;
  role: string;
  postingUrl: string;
  status: ApplicationStatus;
  deadline: string;
  nextAction: string;
  resumeVersionId: string;
  notes: string;
}>;

export type CreateStudyItemPayload = {
  topic: string;
  resource?: string;
  targetDate?: string;
  estimatedHours?: number;
  progress?: number;
  status?: StudyStatus;
  reviewDate?: string;
};

export type PatchStudyItemPayload = Partial<{
  topic: string;
  resource: string;
  targetDate: string;
  estimatedHours: number;
  progress: number;
  status: StudyStatus;
  reviewDate: string;
}>;

export type CreateProjectPayload = {
  name: string;
  goal: string;
  stack?: string;
  status?: ProjectStatus;
  nextAction?: string;
};

export type PatchProjectPayload = {
  status?: ProjectStatus;
  nextAction?: string;
  hasReadme?: boolean;
  hasDemo?: boolean;
  hasDeployment?: boolean;
  hasTests?: boolean;
  portfolioReady?: boolean;
};

export type CreateCalendarEventPayload = CalendarEventDraft;

export async function getActiveSprint(): Promise<Sprint | null> {
  const result = await request<ApiResult<Sprint | null>>("/api/sprints/active");
  return result.data;
}

export async function createSprint(payload: CreateSprintPayload): Promise<Sprint> {
  const result = await request<ApiResult<Sprint>>("/api/sprints", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return result.data;
}

export async function createWorkItem(payload: CreateWorkItemPayload): Promise<WorkItem> {
  const result = await request<ApiResult<WorkItem>>("/api/work-items", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return result.data;
}

export async function updateWorkItemStatus(
  id: string,
  status: WorkItemStatus
): Promise<WorkItem> {
  const result = await request<ApiResult<WorkItem>>(`/api/work-items/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
  return result.data;
}

export async function patchWorkItem(
  id: string,
  payload: PatchWorkItemPayload
): Promise<WorkItem> {
  const result = await request<ApiResult<WorkItem>>(`/api/work-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  return result.data;
}

export async function deleteWorkItem(id: string): Promise<void> {
  await request<void>(`/api/work-items/${id}`, {
    method: "DELETE"
  });
}

export async function listResumeVersions(): Promise<ResumeVersion[]> {
  const result = await request<ApiResult<ResumeVersion[]>>("/api/resume-versions");
  return result.data;
}

export async function createResumeVersion(
  payload: CreateResumeVersionPayload
): Promise<ResumeVersion> {
  const result = await request<ApiResult<ResumeVersion>>("/api/resume-versions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return result.data;
}

export async function updateResumeVersion(
  id: string,
  payload: UpdateResumeVersionPayload
): Promise<ResumeVersion> {
  const result = await request<ApiResult<ResumeVersion>>(`/api/resume-versions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  return result.data;
}

export async function listJobApplications(
  params: JobApplicationListParams = {}
): Promise<JobApplication[]> {
  const result = await request<ApiResult<JobApplication[]>>(
    `/api/applications${toQueryString(params)}`
  );
  return result.data;
}

export async function createJobApplication(
  payload: CreateJobApplicationPayload
): Promise<JobApplication> {
  const result = await request<ApiResult<JobApplication>>("/api/applications", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return result.data;
}

export async function updateJobApplication(
  id: string,
  payload: UpdateJobApplicationPayload
): Promise<JobApplication> {
  const result = await request<ApiResult<JobApplication>>(`/api/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  return result.data;
}

export async function listStudyItems(): Promise<StudyItem[]> {
  const result = await request<ApiResult<StudyItem[]>>("/api/study-items");
  return result.data;
}

export async function createStudyItem(payload: CreateStudyItemPayload): Promise<StudyItem> {
  const result = await request<ApiResult<StudyItem>>("/api/study-items", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return result.data;
}

export async function patchStudyItem(
  id: string,
  payload: PatchStudyItemPayload
): Promise<StudyItem> {
  const result = await request<ApiResult<StudyItem>>(`/api/study-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  return result.data;
}

export async function listProjects(): Promise<PortfolioProject[]> {
  const result = await request<ApiResult<PortfolioProject[]>>("/api/projects");
  return result.data;
}

export async function createProject(payload: CreateProjectPayload): Promise<PortfolioProject> {
  const result = await request<ApiResult<PortfolioProject>>("/api/projects", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return result.data;
}

export async function patchProject(
  id: string,
  payload: PatchProjectPayload
): Promise<PortfolioProject> {
  const result = await request<ApiResult<PortfolioProject>>(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  return result.data;
}

export async function createDailyPlan(payload: DailyPlanRequest): Promise<AssistantResponse> {
  const result = await request<ApiResult<AssistantResponse>>("/api/assistant/daily-plan", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return result.data;
}

export async function createSprintReview(userInstruction?: string): Promise<AssistantResponse> {
  const result = await request<ApiResult<AssistantResponse>>("/api/assistant/sprint-review", {
    method: "POST",
    body: JSON.stringify({ userInstruction })
  });
  return result.data;
}

export async function createApplicationReview(userInstruction?: string): Promise<AssistantResponse> {
  const result = await request<ApiResult<AssistantResponse>>("/api/assistant/application-review", {
    method: "POST",
    body: JSON.stringify({ userInstruction })
  });
  return result.data;
}

export async function createProjectReview(userInstruction?: string): Promise<AssistantResponse> {
  const result = await request<ApiResult<AssistantResponse>>("/api/assistant/project-review", {
    method: "POST",
    body: JSON.stringify({ userInstruction })
  });
  return result.data;
}

export async function getGoogleCalendarStatus(): Promise<CalendarProviderStatus> {
  const result = await request<ApiResult<CalendarProviderStatus>>("/api/calendar/google/status");
  return result.data;
}

export async function getGoogleCalendarAuthUrl(): Promise<string> {
  const result = await request<ApiResult<{ url: string }>>("/api/calendar/google/auth-url");
  return result.data.url;
}

export async function createGoogleCalendarEvent(
  payload: CreateCalendarEventPayload
): Promise<CalendarExportResult> {
  const result = await request<ApiResult<CalendarExportResult>>("/api/calendar/google/events", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return result.data;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function toQueryString(params: JobApplicationListParams): string {
  const query = new URLSearchParams();

  if (params.status) {
    query.set("status", params.status);
  }

  if (typeof params.dueWithinDays === "number") {
    query.set("dueWithinDays", String(params.dueWithinDays));
  }

  if (params.missingNextAction) {
    query.set("missingNextAction", "true");
  }

  const value = query.toString();
  return value ? `?${value}` : "";
}
