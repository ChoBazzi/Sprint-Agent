import {
  getApplicationsMissingNextAction,
  getDueSoonApplications,
  type JobApplication
} from "../../domain/applications";
import type { PortfolioProject } from "../../domain/projects";
import { getDailyRecommendations } from "../../domain/recommendations";
import type { Sprint } from "../../domain/sprint";
import type { StudyItem } from "../../domain/study";

type DailyCommandCenterProps = {
  sprint: Sprint | null;
  applications: JobApplication[];
  studyItems: StudyItem[];
  projects: PortfolioProject[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function DailyCommandCenter({
  sprint,
  applications,
  studyItems,
  projects,
  isLoading,
  error,
  onRetry
}: DailyCommandCenterProps) {
  const today = new Date();
  const recommendations = sprint
    ? getDailyRecommendations(sprint.workItems, today).slice(0, 5)
    : [];
  const dueApplications = getDueSoonApplications(applications, today, 3);
  const missingNextActionApplications = getApplicationsMissingNextAction(applications);
  const jobFollowUpCount = new Set([
    ...dueApplications.map((application) => application.id),
    ...missingNextActionApplications.map((application) => application.id)
  ]).size;
  const dueStudyItems = getDueStudyItems(studyItems, today, 3);
  const portfolioGaps = getPortfolioGaps(projects);
  const blockedCount = sprint?.workItems.filter((item) => item.status === "blocked").length ?? 0;
  const activeCount =
    sprint?.workItems.filter((item) => item.status === "planned" || item.status === "in_progress")
      .length ?? 0;

  return (
    <section className="command-center" aria-labelledby="page-title">
      <div>
        <div className="page-kicker">AI Schedule Assistant</div>
        <h1 id="page-title">오늘의 커맨드 센터</h1>
        <p className="page-summary">
          공부, 프로젝트, 지원 후속 행동을 한 곳에서 정리하고 확정한 시간만 캘린더로 보냅니다.
          AI 제안은 계획을 바꾸지 않고 검토용으로만 생성됩니다.
        </p>
      </div>

      {error ? (
        <div className="notice notice-error" role="alert">
          <strong>데이터를 불러오지 못했습니다.</strong>
          <span>{error}</span>
          <button type="button" onClick={onRetry}>
            다시 시도
          </button>
        </div>
      ) : null}

      <div className="metric-grid" aria-busy={isLoading}>
        <article className="metric">
          <span className="metric-label">Focus Sprint</span>
          <strong>{sprint?.name ?? "없음"}</strong>
          <span>{sprint?.goal ?? "새 Sprint를 만들어 시작하세요."}</span>
        </article>
        <article className="metric">
          <span className="metric-label">Today Work</span>
          <strong>{activeCount}</strong>
          <span>오늘 이어갈 수 있는 작업</span>
        </article>
        <article className="metric">
          <span className="metric-label">Blocked</span>
          <strong>{blockedCount}</strong>
          <span>먼저 풀어야 하는 작업</span>
        </article>
        <article className="metric">
          <span className="metric-label">Study Targets</span>
          <strong>{dueStudyItems.length}</strong>
          <span>3일 안에 목표일인 공부</span>
        </article>
        <article className="metric">
          <span className="metric-label">Job Follow-ups</span>
          <strong>{jobFollowUpCount}</strong>
          <span>마감 또는 다음 행동 확인 필요</span>
        </article>
        <article className="metric">
          <span className="metric-label">Project Gaps</span>
          <strong>{portfolioGaps.length}</strong>
          <span>README, 배포, 테스트 등 보강 필요</span>
        </article>
      </div>

      <article className="panel">
        <div className="panel-header">
          <h2>오늘 실행 후보</h2>
          <span className="subtle">{recommendations.length} items</span>
        </div>
        {recommendations.length > 0 ? (
          <ol className="focus-list">
            {recommendations.map((recommendation) => (
              <li key={recommendation.item.id}>
                <strong>{recommendation.item.title}</strong>
                <span>{recommendation.reasons.join(", ")}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-copy">아직 추천할 작업이 없습니다. Sprint 작업을 먼저 추가하세요.</p>
        )}
      </article>

      <article className="panel">
        <div className="panel-header">
          <h2>계획 알림</h2>
          <span className="subtle">
            {dueApplications.length +
              missingNextActionApplications.length +
              dueStudyItems.length +
              portfolioGaps.length}{" "}
            alerts
          </span>
        </div>
        {dueApplications.length > 0 ||
        missingNextActionApplications.length > 0 ||
        dueStudyItems.length > 0 ||
        portfolioGaps.length > 0 ? (
          <ol className="focus-list">
            {dueApplications.slice(0, 3).map((application) => (
              <li key={`due-${application.id}`}>
                <strong>{application.company}</strong>
                <span>{application.deadline} 마감, {application.nextAction || "다음 액션 미정"}</span>
              </li>
            ))}
            {missingNextActionApplications
              .filter((application) => !dueApplications.some((due) => due.id === application.id))
              .slice(0, 3)
              .map((application) => (
                <li key={`action-${application.id}`}>
                  <strong>{application.company}</strong>
                  <span>{application.role} 다음 액션을 정해야 합니다.</span>
                </li>
              ))}
            {dueStudyItems.slice(0, 3).map((item) => (
              <li key={`study-${item.id}`}>
                <strong>{item.topic}</strong>
                <span>{item.targetDate} 목표, 현재 {item.progress}% 진행</span>
              </li>
            ))}
            {portfolioGaps.slice(0, 3).map((project) => (
              <li key={`project-${project.id}`}>
                <strong>{project.name}</strong>
                <span>{formatPortfolioGap(project)} 보강이 필요합니다.</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-copy">공부, 프로젝트, 지원 후속 행동이 안정적입니다.</p>
        )}
      </article>
    </section>
  );
}

function getDueStudyItems(studyItems: StudyItem[], today: Date, days: number): StudyItem[] {
  return studyItems
    .filter((item) => item.status !== "done")
    .filter((item) => item.targetDate && isWithinDays(item.targetDate, today, days))
    .sort((a, b) => {
      const aDate = a.targetDate ?? "";
      const bDate = b.targetDate ?? "";
      return aDate.localeCompare(bDate) || a.topic.localeCompare(b.topic);
    });
}

function getPortfolioGaps(projects: PortfolioProject[]): PortfolioProject[] {
  return projects
    .filter((project) => project.status !== "archived" && !project.portfolioReady)
    .filter(
      (project) =>
        !project.hasReadme || !project.hasDemo || !project.hasDeployment || !project.hasTests
    )
    .sort((a, b) => gapCount(b) - gapCount(a) || a.name.localeCompare(b.name));
}

function formatPortfolioGap(project: PortfolioProject): string {
  const gaps = [
    !project.hasReadme ? "README" : null,
    !project.hasDemo ? "Demo" : null,
    !project.hasDeployment ? "Deploy" : null,
    !project.hasTests ? "Tests" : null
  ].filter(Boolean);

  return gaps.join(", ");
}

function gapCount(project: PortfolioProject): number {
  return [
    !project.hasReadme,
    !project.hasDemo,
    !project.hasDeployment,
    !project.hasTests
  ].filter(Boolean).length;
}

function isWithinDays(dateValue: string, today: Date, days: number): boolean {
  const target = startOfDay(new Date(dateValue));
  const base = startOfDay(today);
  const diffDays = (target.getTime() - base.getTime()) / (24 * 60 * 60 * 1000);

  return diffDays >= 0 && diffDays <= days;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
