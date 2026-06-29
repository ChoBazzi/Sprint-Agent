import { Router } from "express";
import { z } from "zod";
import { createApplicationService } from "../services/application-service.js";
import type { ApplicationRepository } from "../storage/repositories/application-repository.js";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.");

const createResumeVersionSchema = z.object({
  name: z.string().trim().min(1),
  targetRole: z.string().trim().optional(),
  changeNotes: z.string().trim().optional()
});

const updateResumeVersionSchema = z.object({
  name: z.string().trim().min(1).optional(),
  targetRole: z.string().trim().optional(),
  changeNotes: z.string().trim().optional()
});

const applicationStatusSchema = z.enum([
  "interested",
  "preparing",
  "applied",
  "coding_test",
  "interview",
  "offer",
  "rejected",
  "archived"
]);

const createJobApplicationSchema = z.object({
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  postingUrl: z.string().url().optional().or(z.literal("")),
  status: applicationStatusSchema.optional(),
  deadline: dateSchema.optional(),
  nextAction: z.string().trim().optional(),
  resumeVersionId: z.string().optional(),
  notes: z.string().trim().optional()
});

const updateJobApplicationSchema = z.object({
  company: z.string().trim().min(1).optional(),
  role: z.string().trim().min(1).optional(),
  postingUrl: z.string().url().optional().or(z.literal("")),
  status: applicationStatusSchema.optional(),
  deadline: dateSchema.optional().or(z.literal("")),
  nextAction: z.string().trim().optional(),
  resumeVersionId: z.string().optional().or(z.literal("")),
  notes: z.string().trim().optional()
});

const listJobApplicationsQuerySchema = z.object({
  status: applicationStatusSchema.optional(),
  dueWithinDays: z.coerce.number().int().nonnegative().optional(),
  missingNextAction: z
    .preprocess(
      (value) => {
        if (value === "true") return true;
        if (value === "false") return false;
        return value;
      },
      z.boolean().optional()
    )
    .optional()
});

export function createApplicationRouter(repository: ApplicationRepository): Router {
  const router = Router();
  const service = createApplicationService(repository);

  router.get("/applications", async (request, response, next) => {
    try {
      const filters = listJobApplicationsQuerySchema.parse(request.query);
      response.json({ data: await service.listJobApplications(filters) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/applications", async (request, response, next) => {
    try {
      const input = createJobApplicationSchema.parse(request.body);
      const application = await service.createJobApplication({
        ...input,
        postingUrl: input.postingUrl || undefined
      });
      response.status(201).json({ data: application });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/applications/:id", async (request, response, next) => {
    try {
      const input = updateJobApplicationSchema.parse(request.body);
      const normalizedInput = { ...input };

      if ("postingUrl" in input) normalizedInput.postingUrl = input.postingUrl || undefined;
      if ("deadline" in input) normalizedInput.deadline = input.deadline || undefined;
      if ("resumeVersionId" in input) {
        normalizedInput.resumeVersionId = input.resumeVersionId || undefined;
      }

      const application = await service.updateJobApplication(request.params.id, normalizedInput);

      if (!application) {
        response.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Job application not found."
          }
        });
        return;
      }

      response.json({ data: application });
    } catch (error) {
      next(error);
    }
  });

  router.get("/resume-versions", async (_request, response, next) => {
    try {
      response.json({ data: await service.listResumeVersions() });
    } catch (error) {
      next(error);
    }
  });

  router.post("/resume-versions", async (request, response, next) => {
    try {
      const input = createResumeVersionSchema.parse(request.body);
      const resumeVersion = await service.createResumeVersion(input);
      response.status(201).json({ data: resumeVersion });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/resume-versions/:id", async (request, response, next) => {
    try {
      const input = updateResumeVersionSchema.parse(request.body);
      const resumeVersion = await service.updateResumeVersion(request.params.id, input);

      if (!resumeVersion) {
        response.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Resume version not found."
          }
        });
        return;
      }

      response.json({ data: resumeVersion });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
