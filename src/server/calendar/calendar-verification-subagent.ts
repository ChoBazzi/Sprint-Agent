import type { CalendarEventDraft } from "../../domain/calendar.js";
import {
  GoogleCalendarService,
  type GoogleCalendarEventSnapshot
} from "./google-calendar.js";

export type CalendarVerificationResult = {
  verified: true;
  checkedAt: string;
  eventId: string;
  snapshot: GoogleCalendarEventSnapshot;
  mismatches: [];
};

export class CalendarVerificationError extends Error {
  constructor(
    public readonly eventId: string,
    public readonly mismatches: string[],
    public readonly snapshot: GoogleCalendarEventSnapshot
  ) {
    super(`Calendar verification failed: ${mismatches.join("; ")}`);
  }
}

export class CalendarVerificationSubagent {
  constructor(private readonly calendarService: GoogleCalendarService) {}

  async verifyEventMatches(input: {
    eventId: string;
    expected: CalendarEventDraft;
  }): Promise<CalendarVerificationResult> {
    const snapshot = await this.calendarService.getEvent({ eventId: input.eventId });
    const mismatches = compareEvent(input.expected, snapshot);

    if (mismatches.length > 0) {
      throw new CalendarVerificationError(input.eventId, mismatches, snapshot);
    }

    return {
      verified: true,
      checkedAt: new Date().toISOString(),
      eventId: input.eventId,
      snapshot,
      mismatches: []
    };
  }
}

function compareEvent(
  expected: CalendarEventDraft,
  actual: GoogleCalendarEventSnapshot
): string[] {
  const mismatches: string[] = [];

  if (actual.summary !== expected.summary) {
    mismatches.push(`summary expected "${expected.summary}" but got "${actual.summary ?? ""}"`);
  }

  if ((expected.description ?? "") !== (actual.description ?? "")) {
    mismatches.push("description did not match");
  }

  if (!isSameInstant(actual.startDateTime, expected.startDateTime)) {
    mismatches.push(
      `startDateTime expected "${expected.startDateTime}" but got "${actual.startDateTime ?? ""}"`
    );
  }

  if (!isSameInstant(actual.endDateTime, expected.endDateTime)) {
    mismatches.push(
      `endDateTime expected "${expected.endDateTime}" but got "${actual.endDateTime ?? ""}"`
    );
  }

  if (actual.timeZone !== expected.timeZone) {
    mismatches.push(`timeZone expected "${expected.timeZone}" but got "${actual.timeZone ?? ""}"`);
  }

  return mismatches;
}

function isSameInstant(actual: string | undefined, expected: string): boolean {
  if (!actual) {
    return false;
  }

  const actualTime = Date.parse(actual);
  const expectedTime = Date.parse(expected);
  return Number.isFinite(actualTime) && actualTime === expectedTime;
}
