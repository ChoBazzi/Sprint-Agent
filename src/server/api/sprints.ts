import { Router } from "express";
import { z } from "zod";
import type { SprintRepository } from "../storage/repositories/sprint-repository.js";
import { createSprintService } from "../services/sprint-service.js";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.");

const createSprintSchema = z.object({
  name: z.string().trim().min(1),
  goal: z.string().trim().min(1),
  startsOn: dateSchema,
  endsOn: dateSchema,
  capacity: z.number().int().positive().optional()
});

const createWorkItemSchema = z.object({
  sprintId: z.string().optional(),
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  status: z
    .enum(["backlog", "planned", "in_progress", "blocked", "done", "skipped"])
    .optional(),
  area: z.enum(["personal", "study", "application", "project"]),
  dueDate: dateSchema.optional(),
  estimate: z.number().int().positive().optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  blocker: z.string().trim().optional()
});

const updateWorkItemStatusSchema = z.object({
  status: z.enum(["backlog", "planned", "in_progress", "blocked", "done", "skipped"])
});

export function createSprintRouter(repository: SprintRepository): Router {
  const router = Router();
  const service = createSprintService(repository);

  router.get("/sprints/active", async (_request, response, next) => {
    try {
      response.json({ data: await service.getActiveSprint() });
    } catch (error) {
      next(error);
    }
  });

  router.post("/sprints", async (request, response, next) => {
    try {
      const input = createSprintSchema.parse(request.body);
      const sprint = await service.createSprint(input);
      response.status(201).json({ data: sprint });
    } catch (error) {
      next(error);
    }
  });

  router.post("/work-items", async (request, response, next) => {
    try {
      const input = createWorkItemSchema.parse(request.body);
      const workItem = await service.createWorkItem(input);
      response.status(201).json({ data: workItem });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/work-items/:id/status", async (request, response, next) => {
    try {
      const input = updateWorkItemStatusSchema.parse(request.body);
      const workItem = await service.updateWorkItemStatus(request.params.id, input.status);
      response.json({ data: workItem });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function toApiError(error: unknown) {
  if (error instanceof z.ZodError) {
    return {
      status: 422,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data.",
          details: error.flatten()
        }
      }
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "SERVER_ERROR",
        message: "Unexpected server error."
      }
    }
  };
}
