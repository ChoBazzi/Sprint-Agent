import type {
  ApplicationRepository,
  CreateJobApplicationInput,
  CreateResumeVersionInput,
  UpdateResumeVersionInput,
  UpdateJobApplicationInput
} from "../storage/repositories/application-repository.js";
import type { JobApplicationListFilters } from "../../domain/applications.js";

export function createApplicationService(repository: ApplicationRepository) {
  return {
    listJobApplications(filters?: JobApplicationListFilters) {
      return repository.listJobApplications(filters);
    },

    createJobApplication(input: CreateJobApplicationInput) {
      return repository.createJobApplication(input);
    },

    updateJobApplication(id: string, input: UpdateJobApplicationInput) {
      return repository.updateJobApplication(id, input);
    },

    listResumeVersions() {
      return repository.listResumeVersions();
    },

    createResumeVersion(input: CreateResumeVersionInput) {
      return repository.createResumeVersion(input);
    },

    updateResumeVersion(id: string, input: UpdateResumeVersionInput) {
      return repository.updateResumeVersion(id, input);
    }
  };
}
