import type { Sprint, WorkArea, WorkItem, WorkItemStatus } from "../../../domain/sprint.js";

export type CreateSprintInput = {
  name: string;
  goal: string;
  startsOn: string;
  endsOn: string;
  capacity?: number;
};

export type CreateWorkItemInput = {
  sprintId?: string;
  title: string;
  description?: string;
  status?: WorkItemStatus;
  area: WorkArea;
  dueDate?: string;
  estimate?: number;
  priority: 1 | 2 | 3;
  blocker?: string;
};

export type PatchWorkItemInput = Partial<CreateWorkItemInput>;

export interface SprintRepository {
  getActiveSprint(): Promise<Sprint | null>;
  createSprint(input: CreateSprintInput): Promise<Sprint>;
  createWorkItem(input: CreateWorkItemInput): Promise<WorkItem>;
  updateWorkItemStatus(id: string, status: WorkItemStatus): Promise<WorkItem>;
  patchWorkItem(id: string, input: PatchWorkItemInput): Promise<WorkItem>;
  deleteWorkItem(id: string): Promise<void>;
}
