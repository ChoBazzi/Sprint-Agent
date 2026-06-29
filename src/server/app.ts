import cors from "cors";
import express from "express";
import { createAssistantRouter } from "./api/assistant.js";
import { createApplicationRouter } from "./api/applications.js";
import { createCalendarRouter, toCalendarApiError } from "./api/calendar.js";
import { createProjectRouter } from "./api/projects.js";
import { createSprintRouter, toApiError } from "./api/sprints.js";
import { createStudyRouter } from "./api/study.js";
import { PrismaApplicationRepository } from "./storage/repositories/prisma-applications.js";
import { PrismaProjectRepository } from "./storage/repositories/prisma-projects.js";
import { PrismaSprintRepository } from "./storage/repositories/prisma-sprints.js";
import { PrismaStudyRepository } from "./storage/repositories/prisma-study.js";
import { prisma } from "./storage/prisma.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: "http://127.0.0.1:5173" }));
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true, service: "job-prep-assistant" });
  });

  const sprintRepository = new PrismaSprintRepository(prisma);
  const applicationRepository = new PrismaApplicationRepository(prisma);
  const studyRepository = new PrismaStudyRepository(prisma);
  const projectRepository = new PrismaProjectRepository(prisma);

  app.use("/api", createSprintRouter(sprintRepository));
  app.use("/api", createApplicationRouter(applicationRepository));
  app.use("/api", createStudyRouter(studyRepository));
  app.use("/api", createProjectRouter(projectRepository));
  app.use("/api", createCalendarRouter());
  app.use(
    "/api",
    createAssistantRouter(sprintRepository, applicationRepository, studyRepository, projectRepository)
  );

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const apiError = toCalendarApiError(error) ?? toApiError(error);
    response.status(apiError.status).json(apiError.body);
  });

  return app;
}
