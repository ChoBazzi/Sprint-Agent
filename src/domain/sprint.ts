export type WorkItemStatus =
  | "backlog"
  | "planned"
  | "in_progress"
  | "blocked"
  | "done"
  | "skipped";

export type WorkArea = "personal" | "study" | "application" | "project";

export type WorkItem = {
  id: string;
  title: string;
  description?: string;
  status: WorkItemStatus;
  area: WorkArea;
  dueDate?: string;
  estimate?: number;
  priority: 1 | 2 | 3;
  blocker?: string;
  sprintId?: string;
};

export type Sprint = {
  id: string;
  name: string;
  goal: string;
  startsOn: string;
  endsOn: string;
  isActive: boolean;
  capacity?: number;
  workItems: WorkItem[];
};
