import type { AssistantResponse } from "../../domain/assistant";

type AssistantPanelProps = {
  response: AssistantResponse | null;
  isLoading: boolean;
  onRequestPlan: () => Promise<void>;
  onRequestSprintReview: () => Promise<void>;
  onRequestProjectReview: () => Promise<void>;
};

export function AssistantPanel({
  response,
  isLoading,
  onRequestPlan,
  onRequestSprintReview,
  onRequestProjectReview
}: AssistantPanelProps) {
  return (
    <section className="panel assistant-panel" aria-labelledby="assistant-title">
      <div className="panel-header">
        <div>
          <h2 id="assistant-title">AI 일정 비서</h2>
          <p className="subtle">오늘의 공부, 프로젝트, 지원 후속 행동을 실행 가능한 순서로 정리합니다.</p>
        </div>
        <div className="assistant-actions">
          <button type="button" onClick={() => void onRequestPlan()} disabled={isLoading}>
            {isLoading ? "생성 중" : "오늘 계획"}
          </button>
          <button type="button" onClick={() => void onRequestSprintReview()} disabled={isLoading}>
            Sprint 점검
          </button>
          <button type="button" onClick={() => void onRequestProjectReview()} disabled={isLoading}>
            프로젝트 점검
          </button>
        </div>
      </div>

      {response ? (
        <div className="assistant-result">
          <p>{response.summary}</p>
          <div className="suggestion-list">
            {response.suggestions.map((suggestion) => (
              <article className="suggestion-card" key={suggestion.id}>
                <div className="suggestion-title">
                  <strong>{suggestion.title}</strong>
                  <span>{suggestion.confidence}</span>
                </div>
                <p>{suggestion.rationale}</p>
                <ul>
                  {suggestion.suggestedActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          {response.warnings.length > 0 ? (
            <p className="assistant-warning">{response.warnings.join(" ")}</p>
          ) : null}
        </div>
      ) : (
        <p className="empty-copy">오늘 계획을 생성하면 우선순위와 다음 행동이 여기에 표시됩니다.</p>
      )}
    </section>
  );
}
