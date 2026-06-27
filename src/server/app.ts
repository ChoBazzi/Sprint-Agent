import cors from "cors";
import express from "express";
import { createSprintRouter, toApiError } from "./api/sprints.js";
import { PrismaSprintRepository } from "./storage/repositories/prisma-sprints.js";
import { prisma } from "./storage/prisma.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: "http://127.0.0.1:5173" }));
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true, service: "job-prep-assistant" });
  });

  app.use("/api", createSprintRouter(new PrismaSprintRepository(prisma)));

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const apiError = toApiError(error);
    response.status(apiError.status).json(apiError.body);
  });

  return app;
}
