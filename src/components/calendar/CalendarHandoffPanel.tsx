import { useState } from "react";
import type {
  CalendarEventSourceType,
  CalendarExportResult,
  CalendarProviderStatus
} from "../../domain/calendar";
import type { CreateCalendarEventPayload } from "../../storage/api-client";

type CalendarHandoffPanelProps = {
  status: CalendarProviderStatus | null;
  result: CalendarExportResult | null;
  isLoading: boolean;
  onConnect: () => Promise<void>;
  onCreateEvent: (input: CreateCalendarEventPayload) => Promise<void>;
};

const sourceOptions: Array<{ value: CalendarEventSourceType; label: string }> = [
  { value: "study", label: "Study" },
  { value: "application", label: "Application" },
  { value: "project", label: "Project" },
  { value: "sprint", label: "Sprint" },
  { value: "personal", label: "Personal" }
];

export function CalendarHandoffPanel({
  status,
  result,
  isLoading,
  onConnect,
  onCreateEvent
}: CalendarHandoffPanelProps) {
  const [summary, setSummary] = useState("오늘 집중 블록");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState("90");
  const [sourceType, setSourceType] = useState<CalendarEventSourceType>("study");
  const canCreate = Boolean(status?.configured && status.connected && !isLoading);

  return (
    <section className="panel calendar-panel" aria-labelledby="calendar-title">
      <div className="panel-header">
        <div>
          <h2 id="calendar-title">Google Calendar Handoff</h2>
          <p className="subtle">확정한 집중 시간을 Google Calendar에 반영합니다.</p>
        </div>
        <div className="calendar-status-row">
          <span className={status?.connected ? "status-pill" : "status-pill status-muted"}>
            {getStatusLabel(status)}
          </span>
          <button
            type="button"
            className="button-secondary"
            disabled={!status?.configured || status.connected || isLoading}
            onClick={() => void onConnect()}
          >
            Google 연결
          </button>
        </div>
      </div>

      <form
        className="calendar-form"
        onSubmit={(event) => {
          event.preventDefault();
          const duration = Number(durationMinutes);
          if (!summary.trim() || !date || !startTime || !Number.isFinite(duration) || duration <= 0) {
            return;
          }

          const start = new Date(`${date}T${startTime}:00`);
          const end = new Date(start.getTime() + duration * 60 * 1000);
          void onCreateEvent({
            summary,
            description: description || undefined,
            startDateTime: formatLocalDateTimeWithOffset(start),
            endDateTime: formatLocalDateTimeWithOffset(end),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul",
            sourceType
          });
        }}
      >
        <label>
          제목
          <input value={summary} onChange={(event) => setSummary(event.target.value)} />
        </label>
        <label>
          날짜
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label>
          시작
          <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </label>
        <label>
          분
          <input
            type="number"
            min="15"
            step="15"
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.target.value)}
          />
        </label>
        <label>
          영역
          <select
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value as CalendarEventSourceType)}
          >
            {sourceOptions.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="calendar-description">
          메모
          <input value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <button type="submit" disabled={!canCreate || !summary.trim()}>
          캘린더에 반영
        </button>
      </form>

      {result ? (
        <p className="calendar-result">
          생성됨:{" "}
          {result.htmlLink ? (
            <a href={result.htmlLink} target="_blank" rel="noreferrer">
              Google Calendar에서 보기
            </a>
          ) : (
            result.eventId
          )}
        </p>
      ) : null}
    </section>
  );
}

function getStatusLabel(status: CalendarProviderStatus | null): string {
  if (!status) {
    return "확인 중";
  }

  if (!status.configured) {
    return "환경 설정 필요";
  }

  return status.connected ? "연결됨" : "미연결";
}

function formatLocalDateTimeWithOffset(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absoluteOffsetMinutes / 60);
  const remainingOffsetMinutes = absoluteOffsetMinutes % 60;

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${offsetSign}${pad(offsetHours)}:${pad(
    remainingOffsetMinutes
  )}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
