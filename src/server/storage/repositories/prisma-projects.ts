import type { PrismaClient } from "@prisma/client";
import { ProjectStatus as PrismaProjectStatus } from "@prisma/client";
import type { PortfolioProject, ProjectStatus } from "../../../domain/projects.js";
import type {
  CreateProjectInput,
  PatchProjectInput,
  ProjectRepository
} from "./project-repository.js";

type PrismaPortfolioProject = Awaited<
  ReturnType<PrismaClient["portfolioProject"]["findFirst"]>
>;

export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly db: PrismaClient) {}

  async listProjects(): Promise<PortfolioProject[]> {
    const projects = await this.db.portfolioProject.findMany({
      orderBy: [{ portfolioReady: "asc" }, { updatedAt: "desc" }]
    });

    return projects.map(toPortfolioProject);
  }

  async createProject(input: CreateProjectInput): Promise<PortfolioProject> {
    const project = await this.db.portfolioProject.create({
      data: {
        name: input.name,
        goal: input.goal,
        stack: input.stack,
        status: toPrismaProjectStatus(input.status ?? "idea"),
        nextAction: input.nextAction
      }
    });

    return toPortfolioProject(project);
  }

  async patchProject(id: string, input: PatchProjectInput): Promise<PortfolioProject> {
    const project = await this.db.portfolioProject.update({
      where: { id },
      data: {
        status: input.status ? toPrismaProjectStatus(input.status) : undefined,
        nextAction: input.nextAction,
        hasReadme: input.hasReadme,
        hasDemo: input.hasDemo,
        hasDeployment: input.hasDeployment,
        hasTests: input.hasTests,
        portfolioReady: input.portfolioReady
      }
    });

    return toPortfolioProject(project);
  }

  async deleteProject(id: string): Promise<void> {
    await this.db.portfolioProject.delete({ where: { id } });
  }
}

function toPortfolioProject(project: NonNullable<PrismaPortfolioProject>): PortfolioProject {
  return {
    id: project.id,
    name: project.name,
    goal: project.goal,
    stack: project.stack ?? undefined,
    status: fromPrismaProjectStatus(project.status),
    nextAction: project.nextAction ?? undefined,
    hasReadme: project.hasReadme,
    hasDemo: project.hasDemo,
    hasDeployment: project.hasDeployment,
    hasTests: project.hasTests,
    portfolioReady: project.portfolioReady
  };
}

function toPrismaProjectStatus(status: ProjectStatus): PrismaProjectStatus {
  const map: Record<ProjectStatus, PrismaProjectStatus> = {
    idea: PrismaProjectStatus.IDEA,
    active: PrismaProjectStatus.ACTIVE,
    blocked: PrismaProjectStatus.BLOCKED,
    polishing: PrismaProjectStatus.POLISHING,
    ready: PrismaProjectStatus.READY,
    archived: PrismaProjectStatus.ARCHIVED
  };

  return map[status];
}

function fromPrismaProjectStatus(status: PrismaProjectStatus): ProjectStatus {
  const map: Record<PrismaProjectStatus, ProjectStatus> = {
    IDEA: "idea",
    ACTIVE: "active",
    BLOCKED: "blocked",
    POLISHING: "polishing",
    READY: "ready",
    ARCHIVED: "archived"
  };

  return map[status];
}
