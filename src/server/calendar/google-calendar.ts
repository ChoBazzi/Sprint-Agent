import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import type {
  CalendarEventDraft,
  CalendarExportResult,
  CalendarProviderStatus
} from "../../domain/calendar.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3";

export const GOOGLE_CALENDAR_EVENTS_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";

export type GoogleCalendarConfig = {
  clientId?: string;
  clientSecret?: string;
  redirectUri: string;
  calendarId: string;
  appRedirectUrl: string;
  tokenPath: string;
  statePath: string;
  scope: string;
};

type GoogleCalendarToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
};

type OAuthState = {
  value: string;
  expiresAt: number;
};

export type GoogleTokenStore = {
  readToken(): Promise<GoogleCalendarToken | null>;
  writeToken(token: GoogleCalendarToken): Promise<void>;
  readState(): Promise<OAuthState | null>;
  writeState(state: OAuthState): Promise<void>;
  clearState(): Promise<void>;
};

type Fetch = typeof fetch;

type GoogleCalendarServiceOptions = {
  config?: GoogleCalendarConfig;
  tokenStore?: GoogleTokenStore;
  fetch?: Fetch;
};

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  scope: z.string().optional(),
  token_type: z.string().optional()
});

const eventResponseSchema = z.object({
  id: z.string(),
  htmlLink: z.string().optional()
});

export class CalendarIntegrationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

export class GoogleCalendarService {
  private readonly config: GoogleCalendarConfig;
  private readonly tokenStore: GoogleTokenStore;
  private readonly fetchImpl: Fetch;

  constructor(options: GoogleCalendarServiceOptions = {}) {
    this.config = options.config ?? loadGoogleCalendarConfig();
    this.tokenStore = options.tokenStore ?? new FileGoogleTokenStore(this.config);
    this.fetchImpl = options.fetch ?? fetch;
  }

  async getStatus(): Promise<CalendarProviderStatus> {
    return {
      provider: "google",
      configured: this.isConfigured(),
      connected: Boolean(await this.tokenStore.readToken()),
      calendarId: this.config.calendarId,
      scope: this.config.scope
    };
  }

  getAppRedirectUrl(): string {
    return this.config.appRedirectUrl;
  }

  async createAuthUrl(): Promise<string> {
    this.assertConfigured();

    const state = {
      value: randomBytes(16).toString("hex"),
      expiresAt: Date.now() + 10 * 60 * 1000
    };
    await this.tokenStore.writeState(state);

    const params = new URLSearchParams({
      client_id: this.config.clientId ?? "",
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: this.config.scope,
      access_type: "offline",
      prompt: "consent",
      state: state.value
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async completeOAuthCallback(input: { code?: string; state?: string }): Promise<void> {
    this.assertConfigured();

    if (!input.code || !input.state) {
      throw new CalendarIntegrationError(
        "GOOGLE_CALENDAR_INVALID_CALLBACK",
        "Google Calendar OAuth callback is missing code or state.",
        422
      );
    }

    const storedState = await this.tokenStore.readState();
    if (
      !storedState ||
      storedState.value !== input.state ||
      storedState.expiresAt < Date.now()
    ) {
      throw new CalendarIntegrationError(
        "GOOGLE_CALENDAR_INVALID_STATE",
        "Google Calendar OAuth state is invalid or expired.",
        422
      );
    }

    const token = await this.exchangeCodeForToken(input.code);
    const existingToken = await this.tokenStore.readToken();
    await this.tokenStore.writeToken({
      ...existingToken,
      ...token,
      refreshToken: token.refreshToken ?? existingToken?.refreshToken
    });
    await this.tokenStore.clearState();
  }

  async createEvent(input: CalendarEventDraft): Promise<CalendarExportResult> {
    this.assertConfigured();
    const token = await this.getUsableToken();
    const response = await this.fetchImpl(
      `${GOOGLE_CALENDAR_API_URL}/calendars/${encodeURIComponent(this.config.calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(toGoogleEvent(input))
      }
    );

    const payload = await response.json();
    if (!response.ok) {
      throw new CalendarIntegrationError(
        "GOOGLE_CALENDAR_EVENT_CREATE_FAILED",
        extractGoogleErrorMessage(payload),
        response.status
      );
    }

    const event = eventResponseSchema.parse(payload);
    return {
      provider: "google",
      calendarId: this.config.calendarId,
      eventId: event.id,
      htmlLink: event.htmlLink
    };
  }

  async deleteEvent(input: { eventId: string }): Promise<void> {
    this.assertConfigured();
    const token = await this.getUsableToken();
    const response = await this.fetchImpl(
      `${GOOGLE_CALENDAR_API_URL}/calendars/${encodeURIComponent(this.config.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token.accessToken}`
        }
      }
    );

    if (!response.ok && response.status !== 404 && response.status !== 410) {
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      throw new CalendarIntegrationError(
        "GOOGLE_CALENDAR_EVENT_DELETE_FAILED",
        extractGoogleErrorMessage(payload),
        response.status
      );
    }
  }

  private isConfigured(): boolean {
    return Boolean(this.config.clientId && this.config.clientSecret);
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new CalendarIntegrationError(
        "GOOGLE_CALENDAR_NOT_CONFIGURED",
        "Google Calendar OAuth client is not configured.",
        409
      );
    }
  }

  private async getUsableToken(): Promise<GoogleCalendarToken> {
    const token = await this.tokenStore.readToken();
    if (!token) {
      throw new CalendarIntegrationError(
        "GOOGLE_CALENDAR_NOT_CONNECTED",
        "Google Calendar is not connected.",
        409
      );
    }

    if (!isExpiring(token)) {
      return token;
    }

    if (!token.refreshToken) {
      throw new CalendarIntegrationError(
        "GOOGLE_CALENDAR_RECONNECT_REQUIRED",
        "Google Calendar access expired. Reconnect Google Calendar.",
        409
      );
    }

    const refreshed = await this.refreshToken(token.refreshToken);
    const merged = {
      ...token,
      ...refreshed,
      refreshToken: refreshed.refreshToken ?? token.refreshToken
    };
    await this.tokenStore.writeToken(merged);
    return merged;
  }

  private async exchangeCodeForToken(code: string): Promise<GoogleCalendarToken> {
    return this.requestToken({
      code,
      client_id: this.config.clientId ?? "",
      client_secret: this.config.clientSecret ?? "",
      redirect_uri: this.config.redirectUri,
      grant_type: "authorization_code"
    });
  }

  private async refreshToken(refreshToken: string): Promise<GoogleCalendarToken> {
    return this.requestToken({
      refresh_token: refreshToken,
      client_id: this.config.clientId ?? "",
      client_secret: this.config.clientSecret ?? "",
      grant_type: "refresh_token"
    });
  }

  private async requestToken(input: Record<string, string>): Promise<GoogleCalendarToken> {
    const response = await this.fetchImpl(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(input).toString()
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new CalendarIntegrationError(
        "GOOGLE_CALENDAR_TOKEN_FAILED",
        extractGoogleErrorMessage(payload),
        response.status
      );
    }

    const token = tokenResponseSchema.parse(payload);
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
      scope: token.scope,
      tokenType: token.token_type
    };
  }
}

export class FileGoogleTokenStore implements GoogleTokenStore {
  constructor(private readonly config: GoogleCalendarConfig) {}

  async readToken(): Promise<GoogleCalendarToken | null> {
    return readJsonFile<GoogleCalendarToken>(this.config.tokenPath);
  }

  async writeToken(token: GoogleCalendarToken): Promise<void> {
    await writeJsonFile(this.config.tokenPath, token);
  }

  async readState(): Promise<OAuthState | null> {
    return readJsonFile<OAuthState>(this.config.statePath);
  }

  async writeState(state: OAuthState): Promise<void> {
    await writeJsonFile(this.config.statePath, state);
  }

  async clearState(): Promise<void> {
    await rm(this.config.statePath, { force: true });
  }
}

export function loadGoogleCalendarConfig(env: NodeJS.ProcessEnv = process.env): GoogleCalendarConfig {
  return {
    clientId: env.GOOGLE_CALENDAR_CLIENT_ID,
    clientSecret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
    redirectUri:
      env.GOOGLE_CALENDAR_REDIRECT_URI ??
      "http://127.0.0.1:3001/api/calendar/google/callback",
    calendarId: env.GOOGLE_CALENDAR_ID ?? "primary",
    appRedirectUrl: env.APP_ORIGIN ?? "http://127.0.0.1:5173",
    tokenPath:
      env.GOOGLE_CALENDAR_TOKEN_PATH ??
      join(process.cwd(), "private", "google-calendar-token.json"),
    statePath:
      env.GOOGLE_CALENDAR_STATE_PATH ??
      join(process.cwd(), "private", "google-calendar-state.json"),
    scope: GOOGLE_CALENDAR_EVENTS_SCOPE
  };
}

export function toGoogleEvent(input: CalendarEventDraft) {
  return {
    summary: input.summary,
    description: input.description,
    start: {
      dateTime: input.startDateTime,
      timeZone: input.timeZone
    },
    end: {
      dateTime: input.endDateTime,
      timeZone: input.timeZone
    },
    extendedProperties:
      input.sourceType || input.sourceId
        ? {
            private: {
              sourceType: input.sourceType ?? "",
              sourceId: input.sourceId ?? ""
            }
          }
        : undefined
  };
}

function isExpiring(token: GoogleCalendarToken): boolean {
  return typeof token.expiresAt === "number" && token.expiresAt <= Date.now() + 60_000;
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
}

function extractGoogleErrorMessage(payload: unknown): string {
  const result = z
    .object({
      error: z
        .object({
          message: z.string().optional()
        })
        .optional()
    })
    .safeParse(payload);

  return result.success && result.data.error?.message
    ? result.data.error.message
    : "Google Calendar request failed.";
}
