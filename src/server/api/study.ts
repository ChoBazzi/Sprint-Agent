import { Router } from "express";
import { z } from "zod";
import { studyStatuses } from "../../domain/study.js";
import { createStudyService } from "../services/study-service.js";
import type { StudyRepository } from "../storage/repositories/study-repository.js";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.");

const studyStatusSchema = z.enum(studyStatuses);

const createStudyItemSchema = z.object({
  topic: z.string().trim().min(1),
  resource: z.string().trim().optional(),
  targetDate: dateSchema.optional(),
  estimatedHours: z.number().int().positive().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  status: studyStatusSchema.optional(),
  reviewDate: dateSchema.optional()
});

const patchStudyItemSchema = z.object({
  topic: z.string().trim().min(1).optional(),
  resource: z.string().trim().optional(),
  targetDate: dateSchema.optional().or(z.literal("")),
  estimatedHours: z.number().int().positive().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  status: studyStatusSchema.optional(),
  reviewDate: dateSchema.optional().or(z.literal(""))
});

export function createStudyRouter(repository: StudyRepository): Router {
  const router = Router();
  const service = createStudyService(repository);

  router.get("/study-items", async (_request, response, next) => {
    try {
      response.json({ data: await service.listStudyItems() });
    } catch (error) {
      next(error);
    }
  });

  router.post("/study-items", async (request, response, next) => {
    try {
      const input = createStudyItemSchema.parse(request.body);
      const studyItem = await service.createStudyItem(input);
      response.status(201).json({ data: studyItem });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/study-items/:id", async (request, response, next) => {
    try {
      const input = patchStudyItemSchema.parse(request.body);
      const studyItem = await service.patchStudyItem(request.params.id, {
        ...input,
        targetDate: input.targetDate || undefined,
        reviewDate: input.reviewDate || undefined
      });
      response.json({ data: studyItem });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/study-items/:id", async (request, response, next) => {
    try {
      await service.deleteStudyItem(request.params.id);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
