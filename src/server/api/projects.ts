import { Router } from "express";
import { z } from "zod";
import { createProjectService } from "../services/project-service.js";
import type { ProjectRepository } from "../storage/repositories/project-repository.js";

const projectStatusSchema = z.enum([
  "idea",
  "active",
  "blocked",
  "polishing",
  "ready",
  "archived"
]);

const createProjectSchema = z.object({
  name: z.string().trim().min(1),
  goal: z.string().trim().min(1),
  stack: z.string().trim().optional(),
  status: projectStatusSchema.optional(),
  nextAction: z.string().trim().optional()
});

const patchProjectSchema = z
  .object({
    status: projectStatusSchema.optional(),
    nextAction: z.string().trim().optional(),
    hasReadme: z.boolean().optional(),
    hasDemo: z.boolean().optional(),
    hasDeployment: z.boolean().optional(),
    hasTests: z.boolean().optional(),
    portfolioReady: z.boolean().optional()
  })
  .strict();

export function createProjectRouter(repository: ProjectRepository): Router {
  const router = Router();
  const service = createProjectService(repository);

  router.get("/projects", async (_request, response, next) => {
    try {
      response.json({ data: await service.listProjects() });
    } catch (error) {
      next(error);
    }
  });

  router.post("/projects", async (request, response, next) => {
    try {
      const input = createProjectSchema.parse(request.body);
      const project = await service.createProject(input);
      response.status(201).json({ data: project });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/projects/:id", async (request, response, next) => {
    try {
      const input = patchProjectSchema.parse(request.body);
      const project = await service.patchProject(request.params.id, input);
      response.json({ data: project });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/projects/:id", async (request, response, next) => {
    try {
      await service.deleteProject(request.params.id);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
