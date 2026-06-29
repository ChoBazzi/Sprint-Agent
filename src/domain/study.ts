export const studyStatuses = ["backlog", "planned", "in_progress", "reviewing", "done"] as const;

export type StudyStatus = (typeof studyStatuses)[number];

export type StudyItem = {
  id: string;
  topic: string;
  resource?: string;
  targetDate?: string;
  estimatedHours?: number;
  progress: number;
  status: StudyStatus;
  reviewDate?: string;
};
