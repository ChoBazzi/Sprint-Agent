import type {
  AssistantAction,
  AssistantConversationDetail
} from "../../domain/assistant-chat";

type AssistantPanelProps = {
  detail: AssistantConversationDetail | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onApproveAction: (id: string) => Promise<void>;
  onRejectAction: (id: string) => Promise<void>;
  onApplyAction: (id: string) => Promise<void>;
};

export function AssistantPanel({
  detail,
  isLoading,
  onRefresh,
  onApproveAction,
  onRejectAction,
  onApplyAction
}: AssistantPanelProps) {
  const messages = detail?.messages ?? [];
  const actions = detail?.actions ?? [];

  return (
    <section className="panel assistant-panel" aria-labelledby="assistant-title">
      <div className="panel-header">
        <div>
          <h2 id="assistant-title">Codex CLI 상태판</h2>
          <p className="subtle">
            CLI에서 Codex와 대화하면 MCP가 기록한 노트와 캘린더 작업이 여기에 표시됩니다.
          </p>
        </div>
        <div className="assistant-actions">
          <button
            type="button"
            className="button-secondary"
            onClick={() => void onRefresh()}
            disabled={isLoading}
          >
            {isLoading ? "갱신 중" : "새로고침"}
          </button>
        </div>
      </div>

      <div className="assistant-chat-layout">
        <div className="assistant-thread" aria-live="polite">
          {detail ? (
            <div className="assistant-session-meta">
              <strong>{detail.conversation.title}</strong>
              <span>최근 갱신 {formatDateTime(detail.conversation.updatedAt)}</span>
            </div>
          ) : null}
          {messages.length > 0 ? (
            messages.map((message) => (
              <article className={`message-bubble message-${message.role}`} key={message.id}>
                <span>{formatMessageRole(message.role)}</span>
                <p>{message.content}</p>
                <time dateTime={message.createdAt}>{formatDateTime(message.createdAt)}</time>
              </article>
            ))
          ) : (
            <p className="empty-copy">
              아직 MCP가 기록한 CLI 대화 이벤트가 없습니다. Codex CLI에서 작업을 시작하면
              상태가 이곳에 쌓입니다.
            </p>
          )}
          {isLoading ? <p className="assistant-warning">상태를 불러오는 중입니다.</p> : null}
        </div>

        <div className="assistant-action-rail" aria-label="Assistant tracked actions">
          <div className="panel-header">
            <h3>MCP 작업 상태</h3>
            <span className="subtle">{actions.length} items</span>
          </div>
          {actions.length > 0 ? (
            <div className="assistant-action-list">
              {actions.map((action) => (
                <AssistantActionCard
                  action={action}
                  isLoading={isLoading}
                  onApproveAction={onApproveAction}
                  onRejectAction={onRejectAction}
                  onApplyAction={onApplyAction}
                  key={action.id}
                />
              ))}
            </div>
          ) : (
            <p className="empty-copy">MCP가 만든 캘린더 작업 초안이 없습니다.</p>
          )}
        </div>
      </div>
    </section>
  );
}

type AssistantActionCardProps = {
  action: AssistantAction;
  isLoading: boolean;
  onApproveAction: (id: string) => Promise<void>;
  onRejectAction: (id: string) => Promise<void>;
  onApplyAction: (id: string) => Promise<void>;
};

function AssistantActionCard({
  action,
  isLoading,
  onApproveAction,
  onRejectAction,
  onApplyAction
}: AssistantActionCardProps) {
  return (
    <article className="assistant-action-card">
      <div>
        <strong>{action.summary ?? formatActionType(action.type)}</strong>
        <span>{formatActionStatus(action.status)}</span>
      </div>
      {action.startDateTime && action.endDateTime ? (
        <p>
          {formatDateTime(action.startDateTime)} - {formatTime(action.endDateTime)}
        </p>
      ) : null}
      {action.error ? <p className="assistant-warning">{action.error}</p> : null}
      <div className="assistant-action-buttons">
        <button
          type="button"
          className="button-secondary"
          onClick={() => void onApproveAction(action.id)}
          disabled={isLoading || action.status !== "proposed"}
        >
          승인
        </button>
        <button
          type="button"
          onClick={() => void onApplyAction(action.id)}
          disabled={isLoading || action.status !== "approved"}
        >
          반영
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => void onRejectAction(action.id)}
          disabled={isLoading || (action.status !== "proposed" && action.status !== "approved")}
        >
          거절
        </button>
      </div>
    </article>
  );
}

function formatActionType(type: AssistantAction["type"]): string {
  return type === "create_calendar_event" ? "캘린더 추가" : "캘린더 삭제";
}

function formatMessageRole(role: AssistantConversationDetail["messages"][number]["role"]): string {
  const labels: Record<AssistantConversationDetail["messages"][number]["role"], string> = {
    user: "CLI 사용자",
    assistant: "Codex",
    system: "시스템"
  };
  return labels[role];
}

function formatActionStatus(status: AssistantAction["status"]): string {
  const labels: Record<AssistantAction["status"], string> = {
    proposed: "제안됨",
    approved: "승인됨",
    applied: "반영됨",
    rejected: "거절됨",
    failed: "실패"
  };
  return labels[status];
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
