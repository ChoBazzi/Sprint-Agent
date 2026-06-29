import type { AssistantResponse } from "../../domain/assistant";

type AssistantPanelProps = {
  response: AssistantResponse | null;
  isLoading: boolean;
  onRequestPlan: () => Promise<void>;
  onRequestSprintReview: () => Promise<void>;
  onRequestApplicationReview: () => Promise<void>;
  onRequestProjectReview: () => Promise<void>;
};

export function AssistantPanel({
  response,
  isLoading,
  onRequestPlan,
  onRequestSprintReview,
  onRequestApplicationReview,
  onRequestProjectReview
}: AssistantPanelProps) {
  return (
    <section className="panel assistant-panel" aria-labelledby="assistant-title">
      <div className="panel-header">
        <div>
          <h2 id="assistant-title">Codex Daily Plan</h2>
          <p className="subtle">Sprint와 지원관리 데이터를 기준으로 오늘 계획을 제안합니다.</p>
        </div>
        <div className="assistant-actions">
          <button type="button" onClick={() => void onRequestPlan()} disabled={isLoading}>
            {isLoading ? "생성 중" : "Daily Plan"}
          </button>
          <button type="button" onClick={() => void onRequestSprintReview()} disabled={isLoading}>
            Sprint Review
          </button>
          <button type="button" onClick={() => void onRequestApplicationReview()} disabled={isLoading}>
            Application Review
          </button>
          <button type="button" onClick={() => void onRequestProjectReview()} disabled={isLoading}>
            Project Review
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
        <p className="empty-copy">아직 생성된 계획이 없습니다. Sprint 작업을 만든 뒤 요청하세요.</p>
      )}
    </section>
  );
}
