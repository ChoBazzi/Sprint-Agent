export type CalendarEventSourceType =
  | "study"
  | "application"
  | "project"
  | "sprint"
  | "personal";

export type CalendarEventDraft = {
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  sourceType?: CalendarEventSourceType;
  sourceId?: string;
};

export type CalendarProviderStatus = {
  provider: "google";
  configured: boolean;
  connected: boolean;
  calendarId: string;
  scope: string;
};

export type CalendarExportResult = {
  provider: "google";
  calendarId: string;
  eventId: string;
  htmlLink?: string;
};

export function isValidCalendarRange(input: Pick<CalendarEventDraft, "startDateTime" | "endDateTime">): boolean {
  const start = Date.parse(input.startDateTime);
  const end = Date.parse(input.endDateTime);

  return Number.isFinite(start) && Number.isFinite(end) && end > start;
}
