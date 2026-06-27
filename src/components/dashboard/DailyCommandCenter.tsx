import { getDailyRecommendations } from "../../domain/recommendations";
import type { Sprint } from "../../domain/sprint";

type DailyCommandCenterProps = {
  sprint: Sprint | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function DailyCommandCenter({
  sprint,
  isLoading,
  error,
  onRetry
}: DailyCommandCenterProps) {
  const recommendations = sprint
    ? getDailyRecommendations(sprint.workItems, new Date()).slice(0, 5)
    : [];
  const blockedCount = sprint?.workItems.filter((item) => item.status === "blocked").length ?? 0;
  const activeCount =
    sprint?.workItems.filter((item) => item.status === "planned" || item.status === "in_progress")
      .length ?? 0;

  return (
    <section className="command-center" aria-labelledby="page-title">
      <div>
        <div className="page-kicker">Developer Job Prep</div>
        <h1 id="page-title">오늘의 커맨드 센터</h1>
        <p className="page-summary">
          Sprint와 Task를 기준으로 오늘 집중할 일을 정리합니다. Codex 계획 생성은 다음
          슬라이스에서 이 데이터 위에 연결합니다.
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
          <span className="metric-label">Active Sprint</span>
          <strong>{sprint?.name ?? "없음"}</strong>
          <span>{sprint?.goal ?? "새 Sprint를 만들어 시작하세요."}</span>
        </article>
        <article className="metric">
          <span className="metric-label">Planned / In Progress</span>
          <strong>{activeCount}</strong>
          <span>오늘 이어갈 수 있는 작업</span>
        </article>
        <article className="metric">
          <span className="metric-label">Blocked</span>
          <strong>{blockedCount}</strong>
          <span>먼저 풀어야 하는 작업</span>
        </article>
      </div>

      <article className="panel">
        <div className="panel-header">
          <h2>Today Focus</h2>
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
    </section>
  );
}
