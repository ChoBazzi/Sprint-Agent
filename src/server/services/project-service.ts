import type {
  CreateProjectInput,
  PatchProjectInput,
  ProjectRepository
} from "../storage/repositories/project-repository.js";

export function createProjectService(repository: ProjectRepository) {
  return {
    listProjects() {
      return repository.listProjects();
    },

    createProject(input: CreateProjectInput) {
      return repository.createProject(input);
    },

    patchProject(id: string, input: PatchProjectInput) {
      return repository.patchProject(id, input);
    },

    deleteProject(id: string) {
      return repository.deleteProject(id);
    }
  };
}
