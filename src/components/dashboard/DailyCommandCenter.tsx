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
  const alertCount =
    dueApplications.length +
    missingNextActionApplications.length +
    dueStudyItems.length +
    portfolioGaps.length;
  const alerts = [
    ...dueApplications.map((application) => ({
      id: `due-${application.id}`,
      title: application.company,
      body: `${application.deadline} 마감, ${application.nextAction || "다음 액션 미정"}`
    })),
    ...missingNextActionApplications
      .filter((application) => !dueApplications.some((due) => due.id === application.id))
      .map((application) => ({
        id: `action-${application.id}`,
        title: application.company,
        body: `${application.role} 다음 액션을 정해야 합니다.`
      })),
    ...dueStudyItems.map((item) => ({
      id: `study-${item.id}`,
      title: item.topic,
      body: `${item.targetDate} 목표, 현재 ${item.progress}% 진행`
    })),
    ...portfolioGaps.map((project) => ({
      id: `project-${project.id}`,
      title: project.name,
      body: `${formatPortfolioGap(project)} 보강이 필요합니다.`
    }))
  ].slice(0, 4);
  const primaryRecommendation = recommendations[0];
  const secondaryRecommendations = recommendations.slice(1, 4);

  return (
    <section className="command-center" aria-labelledby="page-title">
      <div className="command-hero">
        <div>
          <div className="page-kicker">Personal Assistant</div>
          <h1 id="page-title">오늘의 커맨드 센터</h1>
          <p className="page-summary">
            오늘 처리할 일과 막힌 지점만 먼저 봅니다. 자세한 수정은 아래 작업 관리에서 합니다.
          </p>
        </div>
        <div className="command-summary" aria-busy={isLoading}>
          <div>
            <span>진행 작업</span>
            <strong>{activeCount}</strong>
          </div>
          <div>
            <span>막힘</span>
            <strong>{blockedCount}</strong>
          </div>
          <div>
            <span>알림</span>
            <strong>{alertCount}</strong>
          </div>
        </div>
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

      <div className="command-grid">
      <article className="panel focus-panel">
        <div className="panel-header">
          <h2>지금 먼저 할 일</h2>
          <span className="subtle">{recommendations.length} items</span>
        </div>
        {primaryRecommendation ? (
          <>
            <div className="primary-task">
              <span>{formatArea(primaryRecommendation.item.area)}</span>
              <strong>{primaryRecommendation.item.title}</strong>
              <p>{formatRecommendationReasons(primaryRecommendation.reasons)}</p>
            </div>
            {secondaryRecommendations.length > 0 ? (
          <ol className="focus-list">
                {secondaryRecommendations.map((recommendation) => (
              <li key={recommendation.item.id}>
                <strong>{recommendation.item.title}</strong>
                <span>{formatRecommendationReasons(recommendation.reasons)}</span>
              </li>
            ))}
          </ol>
            ) : null}
          </>
        ) : (
          <p className="empty-copy">아직 추천할 작업이 없습니다. Sprint 작업을 먼저 추가하세요.</p>
        )}
      </article>

      <article className="panel alert-panel">
        <div className="panel-header">
          <h2>주의할 것</h2>
          <span className="subtle">{alertCount} alerts</span>
        </div>
        {dueApplications.length > 0 ||
        missingNextActionApplications.length > 0 ||
        dueStudyItems.length > 0 ||
        portfolioGaps.length > 0 ? (
          <ol className="focus-list">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <strong>{alert.title}</strong>
                <span>{alert.body}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-copy">공부, 프로젝트, 지원 후속 행동이 안정적입니다.</p>
        )}
      </article>
      </div>
    </section>
  );
}

function formatArea(area: Sprint["workItems"][number]["area"]): string {
  const labels: Record<Sprint["workItems"][number]["area"], string> = {
    study: "Study",
    application: "Application",
    project: "Project",
    personal: "Personal"
  };
  return labels[area];
}

function formatRecommendationReasons(reasons: string[]): string {
  const labels: Record<string, string> = {
    blocked: "막힘",
    due_soon: "마감 임박",
    high_priority: "높은 우선순위",
    in_progress: "진행 중",
    planned_sprint_work: "Sprint 계획",
    overdue: "기한 지남"
  };

  return reasons.map((reason) => labels[reason] ?? reason).join(" · ");
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
