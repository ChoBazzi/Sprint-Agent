import type { PortfolioProject } from "../../../domain/projects.js";
import type {
  CreateProjectInput,
  PatchProjectInput,
  ProjectRepository
} from "./project-repository.js";

export class InMemoryProjectRepository implements ProjectRepository {
  private projects = new Map<string, PortfolioProject>();
  private nextId = 1;

  async listProjects(): Promise<PortfolioProject[]> {
    return [...this.projects.values()];
  }

  async createProject(input: CreateProjectInput): Promise<PortfolioProject> {
    const project: PortfolioProject = {
      id: this.createId(),
      name: input.name,
      goal: input.goal,
      stack: input.stack,
      status: input.status ?? "idea",
      nextAction: input.nextAction,
      hasReadme: false,
      hasDemo: false,
      hasDeployment: false,
      hasTests: false,
      portfolioReady: false
    };

    this.projects.set(project.id, project);
    return project;
  }

  async patchProject(id: string, input: PatchProjectInput): Promise<PortfolioProject> {
    const project = this.projects.get(id);

    if (!project) {
      throw new Error(`Portfolio project not found: ${id}`);
    }

    const updated: PortfolioProject = {
      ...project,
      ...input
    };

    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    this.projects.delete(id);
  }

  private createId(): string {
    const id = `project-${this.nextId}`;
    this.nextId += 1;
    return id;
  }
}
