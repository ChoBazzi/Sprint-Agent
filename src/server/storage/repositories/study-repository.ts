import type { StudyItem, StudyStatus } from "../../../domain/study.js";

export type CreateStudyItemInput = {
  topic: string;
  resource?: string;
  targetDate?: string;
  estimatedHours?: number;
  progress?: number;
  status?: StudyStatus;
  reviewDate?: string;
};

export type PatchStudyItemInput = Partial<{
  topic: string;
  resource: string;
  targetDate: string;
  estimatedHours: number;
  progress: number;
  status: StudyStatus;
  reviewDate: string;
}>;

export interface StudyRepository {
  listStudyItems(): Promise<StudyItem[]>;
  createStudyItem(input: CreateStudyItemInput): Promise<StudyItem>;
  patchStudyItem(id: string, input: PatchStudyItemInput): Promise<StudyItem>;
  deleteStudyItem(id: string): Promise<void>;
}
