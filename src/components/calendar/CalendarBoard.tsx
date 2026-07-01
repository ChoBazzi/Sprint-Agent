import { useMemo, useState } from "react";
import type { AssistantAction } from "../../domain/assistant-chat";
import type { Sprint } from "../../domain/sprint";
import type { StudyItem } from "../../domain/study";

type CalendarBoardProps = {
  sprint: Sprint | null;
  studyItems: StudyItem[];
  assistantActions: AssistantAction[];
};

type CalendarEventTone = "sprint" | "study" | "calendar";

type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  meta: string;
  tone: CalendarEventTone;
};

const weekdays = ["월", "화", "수", "목", "금", "토", "일"];

export function CalendarBoard({
  sprint,
  studyItems,
  assistantActions
}: CalendarBoardProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const events = useMemo(
    () => buildCalendarEvents({ sprint, studyItems, assistantActions }),
    [sprint, studyItems, assistantActions]
  );
  const monthDays = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const visibleMonthKey = toMonthKey(visibleMonth);
  const monthEventCount = events.filter((event) => event.date.startsWith(visibleMonthKey)).length;

  function moveMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return (
    <section className="section-stack calendar-board-section" aria-labelledby="calendar-board-title">
      <div className="section-heading">
        <div>
          <h2 id="calendar-board-title">달력</h2>
          <p>작업 마감일, 공부 목표, MCP 캘린더 초안을 월간 보기로 확인합니다.</p>
        </div>
        <div className="calendar-board-controls">
          <button type="button" className="button-secondary" onClick={() => moveMonth(-1)}>
            이전
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setVisibleMonth(startOfMonth(new Date()))}
          >
            오늘
          </button>
          <button type="button" className="button-secondary" onClick={() => moveMonth(1)}>
            다음
          </button>
        </div>
      </div>

      <div className="calendar-board-summary">
        <strong>{formatMonth(visibleMonth)}</strong>
        <span>{monthEventCount}개 일정</span>
      </div>

      <div className="calendar-scroll">
        <div className="calendar-grid" role="grid" aria-label={`${formatMonth(visibleMonth)} 달력`}>
          {weekdays.map((weekday) => (
            <div className="calendar-weekday" role="columnheader" key={weekday}>
              {weekday}
            </div>
          ))}
          {monthDays.map((day) => {
            const dateKey = toDateKey(day);
            const dayEvents = eventsByDate.get(dateKey) ?? [];
            return (
              <article
                className={
                  day.getMonth() === visibleMonth.getMonth()
                    ? "calendar-day"
                    : "calendar-day calendar-day-muted"
                }
                role="gridcell"
                aria-label={`${formatDateLabel(day)} ${dayEvents.length}개 일정`}
                key={dateKey}
              >
                <div className="calendar-day-header">
                  <time dateTime={dateKey}>{day.getDate()}</time>
                  {isSameDate(day, new Date()) ? <span>오늘</span> : null}
                </div>
                <div className="calendar-event-list">
                  {dayEvents.slice(0, 4).map((event) => (
                    <div className={`calendar-event event-${event.tone}`} key={event.id}>
                      <strong>{event.title}</strong>
                      <span>{event.meta}</span>
                    </div>
                  ))}
                  {dayEvents.length > 4 ? (
                    <span className="calendar-more">+{dayEvents.length - 4}개 더</span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function buildCalendarEvents({
  sprint,
  studyItems,
  assistantActions
}: CalendarBoardProps): CalendarEvent[] {
  const sprintEvents =
    sprint?.workItems
      .filter((item) => item.dueDate)
      .map((item) => ({
        id: `work-${item.id}`,
        date: item.dueDate as string,
        title: item.title,
        meta: `${formatWorkArea(item.area)} · ${formatPriority(item.priority)}`,
        tone: "sprint" as const
      })) ?? [];

  const studyEvents = studyItems.flatMap((item) => {
    const events: CalendarEvent[] = [];
    if (item.targetDate) {
      events.push({
        id: `study-target-${item.id}`,
        date: item.targetDate,
        title: item.topic,
        meta: `목표 ${item.progress}%`,
        tone: "study"
      });
    }
    if (item.reviewDate) {
      events.push({
        id: `study-review-${item.id}`,
        date: item.reviewDate,
        title: item.topic,
        meta: "복습",
        tone: "study"
      });
    }
    return events;
  });

  const assistantCalendarEvents = assistantActions
    .filter((action) => action.startDateTime)
    .map((action) => ({
      id: `assistant-action-${action.id}`,
      date: toDateKey(new Date(action.startDateTime as string)),
      title: action.summary ?? "캘린더 초안",
      meta: `${formatTime(action.startDateTime as string)} · ${formatActionStatus(action.status)}`,
      tone: "calendar" as const
    }));

  return [
    ...sprintEvents,
    ...studyEvents,
    ...assistantCalendarEvents
  ].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

function buildMonthGrid(month: Date): Date[] {
  const firstDay = startOfMonth(month);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const firstGridDate = new Date(firstDay);
  firstGridDate.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstGridDate);
    day.setDate(firstGridDate.getDate() + index);
    return day;
  });
}

function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  return events.reduce((grouped, event) => {
    const current = grouped.get(event.date) ?? [];
    current.push(event);
    grouped.set(event.date, current);
    return grouped;
  }, new Map<string, CalendarEvent[]>());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function isSameDate(left: Date, right: Date): boolean {
  return toDateKey(left) === toDateKey(right);
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long"
  }).format(date);
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(date);
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatWorkArea(area: Sprint["workItems"][number]["area"]): string {
  const labels: Record<Sprint["workItems"][number]["area"], string> = {
    study: "Study",
    application: "Application",
    project: "Project",
    personal: "Personal"
  };
  return labels[area];
}

function formatPriority(priority: 1 | 2 | 3): string {
  const labels: Record<1 | 2 | 3, string> = {
    1: "Low",
    2: "Medium",
    3: "High"
  };
  return labels[priority];
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
