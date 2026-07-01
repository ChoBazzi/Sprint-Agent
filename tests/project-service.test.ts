import { describe, expect, it } from "vitest";
import { createProjectService } from "../src/server/services/project-service";
import { InMemoryProjectRepository } from "../src/server/storage/repositories/in-memory-projects";

describe("ProjectService", () => {
  it("creates and lists portfolio projects with readiness defaults", async () => {
    const service = createProjectService(new InMemoryProjectRepository());

    const project = await service.createProject({
      name: "Portfolio Command Center",
      goal: "Show hiring managers a focused project case study",
      stack: "React, Express, PostgreSQL"
    });

    const projects = await service.listProjects();

    expect(project).toMatchObject({
      name: "Portfolio Command Center",
      goal: "Show hiring managers a focused project case study",
      stack: "React, Express, PostgreSQL",
      status: "idea",
      hasReadme: false,
      hasDemo: false,
      hasDeployment: false,
      hasTests: false,
      portfolioReady: false
    });
    expect(projects).toEqual([project]);
  });

  it("patches status, next action, and readiness flags without replacing other fields", async () => {
    const service = createProjectService(new InMemoryProjectRepository());
    const project = await service.createProject({
      name: "Interview Scheduler",
      goal: "Coordinate interview prep slots",
      status: "active",
      nextAction: "Build the initial API"
    });

    const updated = await service.patchProject(project.id, {
      status: "ready",
      nextAction: "Record demo walkthrough",
      hasReadme: true,
      hasDemo: true,
      hasDeployment: true,
      hasTests: true,
      portfolioReady: true
    });

    expect(updated).toMatchObject({
      id: project.id,
      name: "Interview Scheduler",
      goal: "Coordinate interview prep slots",
      status: "ready",
      nextAction: "Record demo walkthrough",
      hasReadme: true,
      hasDemo: true,
      hasDeployment: true,
      hasTests: true,
      portfolioReady: true
    });
  });

  it("deletes portfolio projects", async () => {
    const service = createProjectService(new InMemoryProjectRepository());
    const project = await service.createProject({
      name: "Calendar Sync",
      goal: "Show sprint work on Google Calendar",
      status: "active"
    });

    await service.deleteProject(project.id);

    await expect(service.listProjects()).resolves.toEqual([]);
  });
});
