import { describe, expect, it } from "vitest";
import { createStudyService } from "../src/server/services/study-service";
import { InMemoryStudyRepository } from "../src/server/storage/repositories/in-memory-study";

describe("StudyService", () => {
  it("creates study items with backlog status by default", async () => {
    const service = createStudyService(new InMemoryStudyRepository());

    const studyItem = await service.createStudyItem({
      topic: "React Query 캐싱 전략",
      resource: "공식 문서",
      targetDate: "2026-07-03",
      estimatedHours: 4
    });

    expect(studyItem).toMatchObject({
      id: "study-1",
      topic: "React Query 캐싱 전략",
      resource: "공식 문서",
      targetDate: "2026-07-03",
      estimatedHours: 4,
      progress: 0,
      status: "backlog"
    });
  });

  it("lists study items in insertion order", async () => {
    const service = createStudyService(new InMemoryStudyRepository());

    await service.createStudyItem({ topic: "TypeScript 타입 좁히기", status: "planned" });
    await service.createStudyItem({ topic: "Prisma 관계 모델링", status: "reviewing" });

    const studyItems = await service.listStudyItems();

    expect(studyItems.map((item) => item.topic)).toEqual([
      "TypeScript 타입 좁히기",
      "Prisma 관계 모델링"
    ]);
  });

  it("patches study item status and progress fields", async () => {
    const service = createStudyService(new InMemoryStudyRepository());
    const studyItem = await service.createStudyItem({
      topic: "Express 에러 핸들링",
      status: "planned",
      targetDate: "2026-07-01"
    });

    const updated = await service.patchStudyItem(studyItem.id, {
      status: "in_progress",
      progress: 45,
      reviewDate: "2026-07-03"
    });

    expect(updated).toMatchObject({
      id: studyItem.id,
      topic: "Express 에러 핸들링",
      status: "in_progress",
      progress: 45,
      targetDate: "2026-07-01",
      reviewDate: "2026-07-03"
    });
  });

  it("deletes study items", async () => {
    const service = createStudyService(new InMemoryStudyRepository());
    const studyItem = await service.createStudyItem({
      topic: "인증 인가 플로우",
      status: "planned"
    });

    await service.deleteStudyItem(studyItem.id);

    await expect(service.listStudyItems()).resolves.toEqual([]);
  });
});
