import type {
  CreatePortfolioProjectInput,
  PatchPortfolioProjectInput,
  PortfolioProject
} from "../../../domain/projects.js";

export type CreateProjectInput = CreatePortfolioProjectInput;
export type PatchProjectInput = PatchPortfolioProjectInput;

export interface ProjectRepository {
  listProjects(): Promise<PortfolioProject[]>;
  createProject(input: CreateProjectInput): Promise<PortfolioProject>;
  patchProject(id: string, input: PatchProjectInput): Promise<PortfolioProject>;
}
