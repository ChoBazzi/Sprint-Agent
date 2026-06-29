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
  postingUrl?: string;
  status: ApplicationStatus;
  deadline?: string;
  nextAction?: string;
  resumeVersionId?: string;
  resumeVersionName?: string;
  notes?: string;
};

export type ResumeVersion = {
  id: string;
  name: string;
  targetRole?: string;
  changeNotes?: string;
};

export type JobApplicationListFilters = {
  status?: ApplicationStatus;
  dueWithinDays?: number;
  missingNextAction?: boolean;
  today?: Date;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const inactiveStatuses = new Set<ApplicationStatus>(["offer", "rejected", "archived"]);

export function getDueSoonApplications(
  applications: JobApplication[],
  today: Date,
  days: number
): JobApplication[] {
  return applications
    .filter((application) => isActive(application))
    .filter((application) => application.deadline && isWithinDays(application.deadline, today, days))
    .sort((a, b) => {
      const aDeadline = a.deadline ?? "";
      const bDeadline = b.deadline ?? "";
      return (
        aDeadline.localeCompare(bDeadline) ||
        a.company.localeCompare(b.company) ||
        a.id.localeCompare(b.id)
      );
    });
}

export function getApplicationsByStatus(
  applications: JobApplication[],
  status: ApplicationStatus
): JobApplication[] {
  return applications
    .filter((application) => application.status === status)
    .sort(compareByDeadlineCompanyId);
}

export function getApplicationsMissingNextAction(
  applications: JobApplication[]
): JobApplication[] {
  return applications
    .filter((application) => isActive(application))
    .filter((application) => !application.nextAction?.trim())
    .sort((a, b) => a.company.localeCompare(b.company) || a.id.localeCompare(b.id));
}

export function filterJobApplications(
  applications: JobApplication[],
  filters: JobApplicationListFilters = {}
): JobApplication[] {
  const hasStatusFilter = Boolean(filters.status);
  const hasDueFilter = typeof filters.dueWithinDays === "number";
  const hasMissingNextActionFilter = filters.missingNextAction === true;

  if (!hasStatusFilter && !hasDueFilter && !hasMissingNextActionFilter) {
    return applications;
  }

  let matches = [...applications];

  if (filters.status) {
    matches = matches.filter((application) => application.status === filters.status);
  }

  if (hasMissingNextActionFilter) {
    matches = matches.filter((application) => isActive(application));
    matches = matches.filter((application) => !application.nextAction?.trim());
  }

  if (hasDueFilter) {
    const today = filters.today ?? new Date();
    const days = filters.dueWithinDays ?? 0;
    matches = matches.filter((application) => isActive(application));
    matches = matches.filter(
      (application) => application.deadline && isWithinDays(application.deadline, today, days)
    );
  }

  return matches.sort(compareByDeadlineCompanyId);
}

function isActive(application: JobApplication): boolean {
  return !inactiveStatuses.has(application.status);
}

function compareByDeadlineCompanyId(a: JobApplication, b: JobApplication): number {
  const aDeadline = a.deadline ?? "9999-12-31";
  const bDeadline = b.deadline ?? "9999-12-31";

  return (
    aDeadline.localeCompare(bDeadline) ||
    a.company.localeCompare(b.company) ||
    a.id.localeCompare(b.id)
  );
}

function isWithinDays(dateValue: string, today: Date, days: number): boolean {
  const target = startOfDay(new Date(dateValue));
  const base = startOfDay(today);
  const diffDays = (target.getTime() - base.getTime()) / DAY_IN_MS;

  return diffDays >= 0 && diffDays <= days;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
