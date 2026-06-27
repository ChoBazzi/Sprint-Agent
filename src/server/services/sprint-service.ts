import type { WorkItemStatus } from "../../domain/sprint.js";
import type {
  CreateSprintInput,
  CreateWorkItemInput,
  SprintRepository
} from "../storage/repositories/sprint-repository.js";

export function createSprintService(repository: SprintRepository) {
  return {
    getActiveSprint() {
      return repository.getActiveSprint();
    },

    createSprint(input: CreateSprintInput) {
      return repository.createSprint(input);
    },

    createWorkItem(input: CreateWorkItemInput) {
      return repository.createWorkItem(input);
    },

    updateWorkItemStatus(id: string, status: WorkItemStatus) {
      return repository.updateWorkItemStatus(id, status);
    }
  };
}
