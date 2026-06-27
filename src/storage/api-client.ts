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

  return response.json() as Promise<T>;
}
