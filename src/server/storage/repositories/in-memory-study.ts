import type { StudyItem } from "../../../domain/study.js";
import type {
  CreateStudyItemInput,
  PatchStudyItemInput,
  StudyRepository
} from "./study-repository.js";

export class InMemoryStudyRepository implements StudyRepository {
  private studyItems = new Map<string, StudyItem>();
  private nextId = 1;

  async listStudyItems(): Promise<StudyItem[]> {
    return [...this.studyItems.values()];
  }

  async createStudyItem(input: CreateStudyItemInput): Promise<StudyItem> {
    const studyItem: StudyItem = {
      id: this.createId(),
      topic: input.topic,
      resource: input.resource,
      targetDate: input.targetDate,
      estimatedHours: input.estimatedHours,
      progress: input.progress ?? 0,
      status: input.status ?? "backlog",
      reviewDate: input.reviewDate
    };

    this.studyItems.set(studyItem.id, studyItem);
    return studyItem;
  }

  async patchStudyItem(id: string, input: PatchStudyItemInput): Promise<StudyItem> {
    const studyItem = this.studyItems.get(id);

    if (!studyItem) {
      throw new Error(`Study item not found: ${id}`);
    }

    const updated: StudyItem = { ...studyItem, ...input };
    this.studyItems.set(id, updated);
    return updated;
  }

  private createId(): string {
    const id = `study-${this.nextId}`;
    this.nextId += 1;
    return id;
  }
}
