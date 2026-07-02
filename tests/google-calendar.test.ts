import { describe, expect, it } from "vitest";
import {
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  GoogleCalendarService,
  type GoogleCalendarConfig,
  type GoogleTokenStore
} from "../src/server/calendar/google-calendar";

type StoredToken = Awaited<ReturnType<GoogleTokenStore["readToken"]>>;
type StoredState = Awaited<ReturnType<GoogleTokenStore["readState"]>>;

describe("GoogleCalendarService", () => {
  it("builds an OAuth URL with the Calendar events scope and stores state", async () => {
    const tokenStore = new MemoryGoogleTokenStore();
    const service = new GoogleCalendarService({
      config: makeConfig(),
      tokenStore
    });

    const authUrl = new URL(await service.createAuthUrl());
    const state = await tokenStore.readState();

    expect(authUrl.origin).toBe("https://accounts.google.com");
    expect(authUrl.searchParams.get("client_id")).toBe("client-id");
    expect(authUrl.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:3001/api/calendar/google/callback");
    expect(authUrl.searchParams.get("scope")).toBe(GOOGLE_CALENDAR_EVENTS_SCOPE);
    expect(authUrl.searchParams.get("access_type")).toBe("offline");
    expect(authUrl.searchParams.get("prompt")).toBe("consent");
    expect(authUrl.searchParams.get("state")).toBe(state?.value);
  });

  it("exchanges an OAuth callback code and persists the returned token", async () => {
    const tokenStore = new MemoryGoogleTokenStore();
    const service = new GoogleCalendarService({
      config: makeConfig(),
      tokenStore,
      fetch: async () =>
        jsonResponse({
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
          scope: GOOGLE_CALENDAR_EVENTS_SCOPE,
          token_type: "Bearer"
        })
    });
    const authUrl = new URL(await service.createAuthUrl());

    await service.completeOAuthCallback({
      code: "callback-code",
      state: authUrl.searchParams.get("state") ?? ""
    });

    expect(await tokenStore.readToken()).toMatchObject({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      scope: GOOGLE_CALENDAR_EVENTS_SCOPE
    });
    expect(await tokenStore.readState()).toBeNull();
  });

  it("creates a Google Calendar event with start and end dateTime fields", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const tokenStore = new MemoryGoogleTokenStore({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 3600 * 1000
    });
    const service = new GoogleCalendarService({
      config: makeConfig({ calendarId: "primary" }),
      tokenStore,
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({
          id: "event-1",
          htmlLink: "https://calendar.google.com/event?eid=event-1"
        });
      }
    });

    const result = await service.createEvent({
      summary: "네트워크 면접 질문 정리",
      description: "AI 일정 비서에서 확정한 집중 블록",
      startDateTime: "2026-06-29T00:00:00.000Z",
      endDateTime: "2026-06-29T01:30:00.000Z",
      timeZone: "Asia/Seoul",
      sourceType: "study",
      sourceId: "study-1"
    });
    const body = JSON.parse(String(calls[0].init?.body));

    expect(String(calls[0].input)).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    );
    expect(calls[0].init?.headers).toMatchObject({
      Authorization: "Bearer access-token",
      "Content-Type": "application/json"
    });
    expect(body).toMatchObject({
      summary: "네트워크 면접 질문 정리",
      start: {
        dateTime: "2026-06-29T00:00:00.000Z",
        timeZone: "Asia/Seoul"
      },
      end: {
        dateTime: "2026-06-29T01:30:00.000Z",
        timeZone: "Asia/Seoul"
      },
      extendedProperties: {
        private: {
          sourceType: "study",
          sourceId: "study-1"
        }
      }
    });
    expect(result).toEqual({
      provider: "google",
      calendarId: "primary",
      eventId: "event-1",
      htmlLink: "https://calendar.google.com/event?eid=event-1"
    });
  });

  it("deletes a Google Calendar event by event id", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const tokenStore = new MemoryGoogleTokenStore({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 3600 * 1000
    });
    const service = new GoogleCalendarService({
      config: makeConfig({ calendarId: "primary" }),
      tokenStore,
      fetch: async (input, init) => {
        calls.push({ input, init });
        return new Response(null, { status: 204 });
      }
    });

    await service.deleteEvent({ eventId: "event-1" });

    expect(String(calls[0].input)).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events/event-1"
    );
    expect(calls[0].init).toMatchObject({
      method: "DELETE",
      headers: {
        Authorization: "Bearer access-token"
      }
    });
  });

  it("updates a Google Calendar event by event id", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const tokenStore = new MemoryGoogleTokenStore({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 3600 * 1000
    });
    const service = new GoogleCalendarService({
      config: makeConfig({ calendarId: "primary" }),
      tokenStore,
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({
          id: "event-1",
          htmlLink: "https://calendar.google.com/event?eid=event-1"
        });
      }
    });

    const result = await service.updateEvent({
      eventId: "event-1",
      event: {
        summary: "정보처리기사 실기",
        description: "시험 일정",
        startDateTime: "2026-07-19T09:00:00.000+09:00",
        endDateTime: "2026-07-19T12:00:00.000+09:00",
        timeZone: "Asia/Seoul",
        sourceType: "personal",
        sourceId: "exam-1"
      }
    });
    const body = JSON.parse(String(calls[0].init?.body));

    expect(String(calls[0].input)).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events/event-1"
    );
    expect(calls[0].init?.method).toBe("PATCH");
    expect(body).toMatchObject({
      summary: "정보처리기사 실기",
      start: {
        dateTime: "2026-07-19T09:00:00.000+09:00",
        timeZone: "Asia/Seoul"
      },
      end: {
        dateTime: "2026-07-19T12:00:00.000+09:00",
        timeZone: "Asia/Seoul"
      }
    });
    expect(result).toEqual({
      provider: "google",
      calendarId: "primary",
      eventId: "event-1",
      htmlLink: "https://calendar.google.com/event?eid=event-1"
    });
  });

  it("reads a Google Calendar event snapshot by event id", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const tokenStore = new MemoryGoogleTokenStore({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 3600 * 1000
    });
    const service = new GoogleCalendarService({
      config: makeConfig({ calendarId: "primary" }),
      tokenStore,
      fetch: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({
          id: "event-1",
          htmlLink: "https://calendar.google.com/event?eid=event-1",
          summary: "정보처리기사 실기",
          description: "시험 일정",
          start: {
            dateTime: "2026-07-19T09:00:00+09:00",
            timeZone: "Asia/Seoul"
          },
          end: {
            dateTime: "2026-07-19T12:00:00+09:00",
            timeZone: "Asia/Seoul"
          }
        });
      }
    });

    const snapshot = await service.getEvent({ eventId: "event-1" });

    expect(String(calls[0].input)).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events/event-1"
    );
    expect(calls[0].init).toMatchObject({
      method: "GET",
      headers: {
        Authorization: "Bearer access-token"
      }
    });
    expect(snapshot).toMatchObject({
      id: "event-1",
      summary: "정보처리기사 실기",
      description: "시험 일정",
      startDateTime: "2026-07-19T09:00:00+09:00",
      endDateTime: "2026-07-19T12:00:00+09:00",
      timeZone: "Asia/Seoul"
    });
  });
});

class MemoryGoogleTokenStore implements GoogleTokenStore {
  private token: StoredToken;
  private state: StoredState;

  constructor(token: StoredToken = null) {
    this.token = token;
    this.state = null;
  }

  async readToken(): Promise<StoredToken> {
    return this.token;
  }

  async writeToken(token: NonNullable<StoredToken>): Promise<void> {
    this.token = token;
  }

  async readState(): Promise<StoredState> {
    return this.state;
  }

  async writeState(state: NonNullable<StoredState>): Promise<void> {
    this.state = state;
  }

  async clearState(): Promise<void> {
    this.state = null;
  }
}

function makeConfig(overrides: Partial<GoogleCalendarConfig> = {}): GoogleCalendarConfig {
  return {
    clientId: "client-id",
    clientSecret: "client-secret",
    redirectUri: "http://127.0.0.1:3001/api/calendar/google/callback",
    calendarId: "primary",
    appRedirectUrl: "http://127.0.0.1:5173",
    tokenPath: "/tmp/token.json",
    statePath: "/tmp/state.json",
    scope: GOOGLE_CALENDAR_EVENTS_SCOPE,
    ...overrides
  };
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
