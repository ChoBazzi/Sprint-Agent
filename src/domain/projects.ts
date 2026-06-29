export type ProjectStatus = "idea" | "active" | "blocked" | "polishing" | "ready" | "archived";

export type PortfolioProject = {
  id: string;
  name: string;
  goal: string;
  stack?: string;
  status: ProjectStatus;
  nextAction?: string;
  hasReadme: boolean;
  hasDemo: boolean;
  hasDeployment: boolean;
  hasTests: boolean;
  portfolioReady: boolean;
};

export type CreatePortfolioProjectInput = {
  name: string;
  goal: string;
  stack?: string;
  status?: ProjectStatus;
  nextAction?: string;
};

export type PatchPortfolioProjectInput = {
  status?: ProjectStatus;
  nextAction?: string;
  hasReadme?: boolean;
  hasDemo?: boolean;
  hasDeployment?: boolean;
  hasTests?: boolean;
  portfolioReady?: boolean;
};
