import { describe, expect, it } from "vitest";
import { createApplicationService } from "../src/server/services/application-service";
import { InMemoryApplicationRepository } from "../src/server/storage/repositories/in-memory-applications";

describe("ApplicationService", () => {
  it("creates resume versions and job applications", async () => {
    const service = createApplicationService(new InMemoryApplicationRepository());

    const resumeVersion = await service.createResumeVersion({
      name: "백엔드 지원용 v1",
      targetRole: "Node.js Backend",
      changeNotes: "프로젝트 섹션을 API 중심으로 정리"
    });

    const application = await service.createJobApplication({
      company: "Wanted Labs",
      role: "Backend Developer",
      status: "preparing",
      deadline: "2026-06-30",
      nextAction: "이력서 맞춤 수정",
      resumeVersionId: resumeVersion.id
    });

    await service.createJobApplication({
      company: "Saramin",
      role: "Junior Developer",
      status: "interested"
    });

    const applications = await service.listJobApplications();
    const resumeVersions = await service.listResumeVersions();

    expect(applications).toHaveLength(2);
    expect(applications[0]).toMatchObject({
      id: application.id,
      company: "Wanted Labs",
      resumeVersionName: "백엔드 지원용 v1"
    });
    expect(resumeVersions).toEqual([resumeVersion]);
  });

  it("updates job applications without replacing omitted fields", async () => {
    const service = createApplicationService(new InMemoryApplicationRepository());

    const application = await service.createJobApplication({
      company: "Wanted Labs",
      role: "Backend Developer",
      status: "preparing",
      deadline: "2026-06-30",
      nextAction: "이력서 맞춤 수정",
      notes: "초안 작성 중"
    });

    const updated = await service.updateJobApplication(application.id, {
      status: "applied",
      nextAction: "",
      notes: "지원 완료"
    });

    expect(updated).toMatchObject({
      id: application.id,
      company: "Wanted Labs",
      role: "Backend Developer",
      status: "applied",
      deadline: "2026-06-30",
      nextAction: "",
      notes: "지원 완료"
    });
  });

  it("filters job applications by status, deadline window, and missing next action", async () => {
    const service = createApplicationService(new InMemoryApplicationRepository());

    await service.createJobApplication({
      company: "Applied Co",
      role: "Backend Developer",
      status: "applied",
      deadline: "2026-06-29"
    });
    await service.createJobApplication({
      company: "Preparing Co",
      role: "Platform Engineer",
      status: "preparing",
      deadline: "2026-06-29",
      nextAction: "이력서 수정"
    });
    await service.createJobApplication({
      company: "Late Co",
      role: "API Engineer",
      status: "applied",
      deadline: "2026-07-10"
    });

    const filtered = await service.listJobApplications({
      status: "applied",
      dueWithinDays: 3,
      missingNextAction: true,
      today: new Date("2026-06-28T00:00:00.000Z")
    });

    expect(filtered.map((application) => application.company)).toEqual(["Applied Co"]);
  });

  it("updates resume version metadata", async () => {
    const service = createApplicationService(new InMemoryApplicationRepository());
    const resumeVersion = await service.createResumeVersion({
      name: "백엔드 지원용 v1",
      targetRole: "Backend"
    });

    const updated = await service.updateResumeVersion(resumeVersion.id, {
      name: "백엔드 지원용 v2",
      changeNotes: "성과 중심으로 프로젝트 설명 수정"
    });

    expect(updated).toMatchObject({
      id: resumeVersion.id,
      name: "백엔드 지원용 v2",
      targetRole: "Backend",
      changeNotes: "성과 중심으로 프로젝트 설명 수정"
    });
  });
});
