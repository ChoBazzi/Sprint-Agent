import { describe, expect, it } from "vitest";
import {
  CalendarVerificationError,
  CalendarVerificationSubagent
} from "../src/server/calendar/calendar-verification-subagent";
import type { GoogleCalendarService } from "../src/server/calendar/google-calendar";

describe("CalendarVerificationSubagent", () => {
  it("passes when the Google Calendar event matches the requested event", async () => {
    const verifier = new CalendarVerificationSubagent(
      makeCalendarService({
        id: "event-1",
        summary: "정보처리기사 실기",
        description: "시험 일정",
        startDateTime: "2026-07-19T09:00:00+09:00",
        endDateTime: "2026-07-19T12:00:00+09:00",
        timeZone: "Asia/Seoul"
      })
    );

    const result = await verifier.verifyEventMatches({
      eventId: "event-1",
      expected: {
        summary: "정보처리기사 실기",
        description: "시험 일정",
        startDateTime: "2026-07-19T09:00:00+09:00",
        endDateTime: "2026-07-19T12:00:00+09:00",
        timeZone: "Asia/Seoul",
        sourceType: "personal"
      }
    });

    expect(result.verified).toBe(true);
    expect(result.mismatches).toEqual([]);
  });

  it("fails when the Google Calendar event differs from the requested event", async () => {
    const verifier = new CalendarVerificationSubagent(
      makeCalendarService({
        id: "event-1",
        summary: "다른 일정",
        startDateTime: "2026-07-19T10:00:00+09:00",
        endDateTime: "2026-07-19T12:00:00+09:00",
        timeZone: "Asia/Seoul"
      })
    );

    await expect(
      verifier.verifyEventMatches({
        eventId: "event-1",
        expected: {
          summary: "정보처리기사 실기",
          startDateTime: "2026-07-19T09:00:00+09:00",
          endDateTime: "2026-07-19T12:00:00+09:00",
          timeZone: "Asia/Seoul"
        }
      })
    ).rejects.toThrow(CalendarVerificationError);
  });
});

function makeCalendarService(
  snapshot: Awaited<ReturnType<GoogleCalendarService["getEvent"]>>
): GoogleCalendarService {
  return {
    getEvent: async () => snapshot
  } as unknown as GoogleCalendarService;
}
