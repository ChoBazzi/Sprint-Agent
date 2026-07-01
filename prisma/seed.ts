import { PrismaClient } from "@prisma/client";
import {
  ProjectStatus,
  StudyStatus,
  WorkItemStatus
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const today = toDateOnly(new Date());
  const inTwoDays = addDays(today, 2);
  const inFourDays = addDays(today, 4);
  const nextWeek = addDays(today, 7);

  await prisma.assistantMessage.deleteMany();
  await prisma.assistantAction.deleteMany();
  await prisma.assistantConversation.deleteMany();
  await prisma.calendarEventLink.deleteMany();
  await prisma.workItem.deleteMany({
    where: { title: { startsWith: "E2E " } }
  });
  await prisma.jobApplication.deleteMany({
    where: { company: { startsWith: "E2E " } }
  });
  await prisma.studyItem.deleteMany({
    where: { topic: { startsWith: "E2E " } }
  });
  await prisma.portfolioProject.deleteMany({
    where: { name: { startsWith: "E2E " } }
  });
  await prisma.workItem.deleteMany({
    where: { id: { startsWith: "seed-work-" } }
  });
  await prisma.sprint.deleteMany({
    where: { id: "seed-sprint-current" }
  });
  await prisma.jobApplication.deleteMany({
    where: { id: { startsWith: "seed-application-" } }
  });
  await prisma.resumeVersion.deleteMany({
    where: { id: { startsWith: "seed-resume-" } }
  });
  await prisma.studyItem.deleteMany({
    where: { id: { startsWith: "seed-study-" } }
  });
  await prisma.portfolioProject.deleteMany({
    where: { id: { startsWith: "seed-project-" } }
  });

  await prisma.sprint.updateMany({
    where: { isActive: true },
    data: { isActive: false }
  });

  await prisma.sprint.create({
    data: {
      id: "seed-sprint-current",
      name: "취업 준비 Sprint",
      goal: "지원 루틴, 면접 공부, 포트폴리오 보강을 한 주 안에 안정화",
      startsOn: toDate(today),
      endsOn: toDate(nextWeek),
      capacity: 20,
      isActive: true,
      workItems: {
        create: [
          {
            id: "seed-work-application-review",
            title: "마감 임박 지원건 이력서 최종 점검",
            status: WorkItemStatus.PLANNED,
            area: "application",
            dueDate: toDate(inTwoDays),
            priority: 3
          },
          {
            id: "seed-work-study-network",
            title: "네트워크 면접 질문 10개 정리",
            status: WorkItemStatus.IN_PROGRESS,
            area: "study",
            dueDate: toDate(inFourDays),
            priority: 2
          },
          {
            id: "seed-work-project-readme",
            title: "포트폴리오 README 사용 흐름 작성",
            status: WorkItemStatus.BLOCKED,
            area: "project",
            priority: 2,
            blocker: "스크린샷 캡처 필요"
          }
        ]
      }
    }
  });

  await prisma.studyItem.createMany({
    data: [
      {
        id: "seed-study-network",
        topic: "네트워크 면접 질문",
        resource: "개인 노트",
        targetDate: toDate(inTwoDays),
        estimatedHours: 3,
        progress: 30,
        status: StudyStatus.PLANNED
      },
      {
        id: "seed-study-prisma",
        topic: "Prisma 관계 모델링 복습",
        resource: "프로젝트 코드",
        targetDate: toDate(inFourDays),
        estimatedHours: 2,
        progress: 60,
        status: StudyStatus.REVIEWING,
        reviewDate: toDate(nextWeek)
      }
    ]
  });

  await prisma.portfolioProject.createMany({
    data: [
      {
        id: "seed-project-job-prep-assistant",
        name: "Developer Job-Prep Assistant",
        goal: "취업 준비 루틴을 개발자식 Sprint로 관리하는 개인 도구",
        stack: "React, Express, PostgreSQL, Prisma",
        status: ProjectStatus.ACTIVE,
        nextAction: "README에 핵심 사용자 흐름과 DB 설계 의도 정리",
        hasReadme: false,
        hasDemo: false,
        hasDeployment: false,
        hasTests: true,
        portfolioReady: false
      }
    ]
  });
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateValue: string, days: number): string {
  const date = toDate(dateValue);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnly(date);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed data is ready.");
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    console.error(error);
    process.exit(1);
  });
