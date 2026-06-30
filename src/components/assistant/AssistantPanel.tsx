import { useState } from "react";
import type {
  AssistantAction,
  AssistantConversationDetail
} from "../../domain/assistant-chat";

type AssistantPanelProps = {
  detail: AssistantConversationDetail | null;
  isLoading: boolean;
  onSendMessage: (content: string) => Promise<void>;
  onApproveAction: (id: string) => Promise<void>;
  onRejectAction: (id: string) => Promise<void>;
  onApplyAction: (id: string) => Promise<void>;
};

const quickPrompts = [
  { label: "오늘 계획", prompt: "오늘 공부, 프로젝트, 지원 후속 행동을 시간 순서로 정리해줘." },
  { label: "빈 시간 찾기", prompt: "오늘 집중 블록으로 만들 만한 일정을 제안해줘." },
  { label: "Sprint 점검", prompt: "현재 Sprint에서 오늘 줄이거나 먼저 처리할 일을 점검해줘." }
];

export function AssistantPanel({
  detail,
  isLoading,
  onSendMessage,
  onApproveAction,
  onRejectAction,
  onApplyAction
}: AssistantPanelProps) {
  const [draft, setDraft] = useState("");
  const messages = detail?.messages ?? [];
  const actions = detail?.actions ?? [];

  async function submitMessage(content: string) {
    const normalized = content.trim();
    if (!normalized || isLoading) {
      return;
    }

    setDraft("");
    await onSendMessage(normalized);
  }

  return (
    <section className="panel assistant-panel" aria-labelledby="assistant-title">
      <div className="panel-header">
        <div>
          <h2 id="assistant-title">AI 일정 비서</h2>
          <p className="subtle">Codex가 MCP 캘린더 도구로 초안을 만들고, 적용 상태를 추적합니다.</p>
        </div>
        <div className="assistant-actions">
          {quickPrompts.map((item) => (
            <button
              key={item.label}
              type="button"
              className="button-secondary"
              onClick={() => void submitMessage(item.prompt)}
              disabled={isLoading}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="assistant-chat-layout">
        <div className="assistant-thread" aria-live="polite">
          {messages.length > 0 ? (
            messages.map((message) => (
              <article className={`message-bubble message-${message.role}`} key={message.id}>
                <span>{message.role === "user" ? "나" : "비서"}</span>
                <p>{message.content}</p>
              </article>
            ))
          ) : (
            <p className="empty-copy">
              오늘 할 일을 말하면 대화 기록과 캘린더 작업 상태가 이곳에 쌓입니다.
            </p>
          )}
          {isLoading ? <p className="assistant-warning">Codex 응답을 기다리는 중입니다.</p> : null}
        </div>

        <div className="assistant-action-rail" aria-label="Assistant tracked actions">
          <div className="panel-header">
            <h3>작업 상태</h3>
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
            <p className="empty-copy">승인이 필요한 캘린더 작업이 없습니다.</p>
          )}
        </div>
      </div>

      <form
        className="assistant-compose"
        onSubmit={(event) => {
          event.preventDefault();
          void submitMessage(draft);
        }}
      >
        <label>
          메시지
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="예: 내일 오전에 네트워크 공부 2시간 잡아줘"
          />
        </label>
        <button type="submit" disabled={isLoading || !draft.trim()}>
          {isLoading ? "전송 중" : "전송"}
        </button>
      </form>
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
