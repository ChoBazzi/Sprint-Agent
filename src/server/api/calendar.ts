import { Router } from "express";
import { z } from "zod";
import { isValidCalendarRange } from "../../domain/calendar.js";
import {
  CalendarIntegrationError,
  GoogleCalendarService
} from "../calendar/google-calendar.js";

const calendarEventSchema = z.object({
  summary: z.string().trim().min(1),
  description: z.string().trim().optional(),
  startDateTime: z.string().datetime({ offset: true }),
  endDateTime: z.string().datetime({ offset: true }),
  timeZone: z.string().trim().min(1).default("Asia/Seoul"),
  sourceType: z
    .enum(["study", "application", "project", "sprint", "personal"])
    .optional(),
  sourceId: z.string().trim().optional()
});

export function createCalendarRouter(service = new GoogleCalendarService()): Router {
  const router = Router();

  router.get("/calendar/google/status", async (_request, response, next) => {
    try {
      response.json({ data: await service.getStatus() });
    } catch (error) {
      next(error);
    }
  });

  router.get("/calendar/google/auth-url", async (_request, response, next) => {
    try {
      response.json({ data: { url: await service.createAuthUrl() } });
    } catch (error) {
      next(error);
    }
  });

  router.get("/calendar/google/callback", async (request, response, next) => {
    try {
      await service.completeOAuthCallback({
        code: typeof request.query.code === "string" ? request.query.code : undefined,
        state: typeof request.query.state === "string" ? request.query.state : undefined
      });
      response.redirect(`${service.getAppRedirectUrl()}?calendar=connected`);
    } catch (error) {
      next(error);
    }
  });

  router.post("/calendar/google/events", async (request, response, next) => {
    try {
      const input = calendarEventSchema.parse(request.body);
      if (!isValidCalendarRange(input)) {
        throw new CalendarIntegrationError(
          "INVALID_CALENDAR_EVENT_RANGE",
          "Calendar event end time must be after the start time.",
          422
        );
      }

      response.status(201).json({ data: await service.createEvent(input) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function toCalendarApiError(error: unknown) {
  if (error instanceof CalendarIntegrationError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message
        }
      }
    };
  }

  if (error instanceof z.ZodError) {
    return {
      status: 422,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid calendar request data.",
          details: error.flatten()
        }
      }
    };
  }

  return null;
}
