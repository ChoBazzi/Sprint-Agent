import type { StudyStatus } from "../../domain/study.js";
import type {
  CreateStudyItemInput,
  PatchStudyItemInput,
  StudyRepository
} from "../storage/repositories/study-repository.js";

export function createStudyService(repository: StudyRepository) {
  return {
    listStudyItems() {
      return repository.listStudyItems();
    },

    createStudyItem(input: CreateStudyItemInput) {
      return repository.createStudyItem(input);
    },

    updateStudyItemStatus(id: string, status: StudyStatus) {
      return repository.patchStudyItem(id, { status });
    },

    patchStudyItem(id: string, input: PatchStudyItemInput) {
      return repository.patchStudyItem(id, input);
    },

    deleteStudyItem(id: string) {
      return repository.deleteStudyItem(id);
    }
  };
}
