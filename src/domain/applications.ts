export type ApplicationStatus =
  | "interested"
  | "preparing"
  | "applied"
  | "coding_test"
  | "interview"
  | "offer"
  | "rejected"
  | "archived";

export type JobApplication = {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  deadline?: string;
  nextAction?: string;
  resumeVersionId?: string;
};
