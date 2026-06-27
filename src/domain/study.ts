export type StudyStatus = "backlog" | "planned" | "in_progress" | "reviewing" | "done";

export type StudyItem = {
  id: string;
  topic: string;
  status: StudyStatus;
  targetDate?: string;
  progress: number;
  reviewDate?: string;
};
