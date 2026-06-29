import { useEffect, useState } from "react";
import type { StudyItem, StudyStatus } from "../../domain/study";
import type { CreateStudyItemPayload, PatchStudyItemPayload } from "../../storage/api-client";

type StudyPlannerProps = {
  studyItems: StudyItem[];
  onCreateStudyItem: (input: CreateStudyItemPayload) => Promise<void>;
  onPatchStudyItem: (id: string, input: PatchStudyItemPayload) => Promise<void>;
};

const studyStatuses: Array<{ value: StudyStatus; label: string }> = [
  { value: "backlog", label: "Backlog" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "reviewing", label: "Reviewing" },
  { value: "done", label: "Done" }
];

export function StudyPlanner({
  studyItems,
  onCreateStudyItem,
  onPatchStudyItem
}: StudyPlannerProps) {
  return (
    <section className="section-stack" aria-labelledby="study-title">
      <div className="section-heading">
        <h2 id="study-title">Study Planner</h2>
        <p>학습 목표, 목표일, 복습 상태를 취업 준비 일정과 함께 관리합니다.</p>
      </div>

      <StudyItemForm onSubmit={onCreateStudyItem} />

      <div className="dense-list" role="list" aria-label="Study items">
        {studyItems.length > 0 ? (
          studyItems.map((item) => (
            <StudyItemRow item={item} onPatchStudyItem={onPatchStudyItem} key={item.id} />
          ))
        ) : (
          <p className="empty-copy">아직 등록된 공부 항목이 없습니다.</p>
        )}
      </div>
    </section>
  );
}

type StudyItemRowProps = {
  item: StudyItem;
  onPatchStudyItem: StudyPlannerProps["onPatchStudyItem"];
};

function StudyItemRow({ item, onPatchStudyItem }: StudyItemRowProps) {
  const [draft, setDraft] = useState({
    status: item.status,
    targetDate: item.targetDate ?? "",
    progress: String(item.progress),
    reviewDate: item.reviewDate ?? ""
  });
  useEffect(() => {
    setDraft({
      status: item.status,
      targetDate: item.targetDate ?? "",
      progress: String(item.progress),
      reviewDate: item.reviewDate ?? ""
    });
  }, [item.status, item.targetDate, item.progress, item.reviewDate]);
  const hasChanges =
    draft.status !== item.status ||
    draft.targetDate !== (item.targetDate ?? "") ||
    Number(draft.progress) !== item.progress ||
    draft.reviewDate !== (item.reviewDate ?? "");

  return (
    <article className="dense-row study-row" role="listitem">
      <div>
        <strong>{item.topic}</strong>
        <span>{item.resource ?? "자료 미정"}</span>
      </div>
      <label>
        목표일
        <input
          type="date"
          value={draft.targetDate}
          onChange={(event) =>
            setDraft((current) => ({ ...current, targetDate: event.target.value }))
          }
        />
      </label>
      <label>
        진행률
        <input
          type="number"
          min="0"
          max="100"
          value={draft.progress}
          onChange={(event) =>
            setDraft((current) => ({ ...current, progress: event.target.value }))
          }
        />
      </label>
      <label>
        복습일
        <input
          type="date"
          value={draft.reviewDate}
          onChange={(event) =>
            setDraft((current) => ({ ...current, reviewDate: event.target.value }))
          }
        />
      </label>
      <select
        aria-label={`${item.topic} 상태 변경`}
        value={draft.status}
        onChange={(event) =>
          setDraft((current) => ({
            ...current,
            status: event.target.value as StudyStatus
          }))
        }
      >
        {studyStatuses.map((status) => (
          <option value={status.value} key={status.value}>
            {status.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!hasChanges}
        onClick={() =>
          void onPatchStudyItem(item.id, {
            status: draft.status,
            targetDate: draft.targetDate,
            progress: Number(draft.progress),
            reviewDate: draft.reviewDate
          })
        }
      >
        저장
      </button>
    </article>
  );
}

type StudyItemFormProps = {
  onSubmit: StudyPlannerProps["onCreateStudyItem"];
};

function StudyItemForm({ onSubmit }: StudyItemFormProps) {
  const [topic, setTopic] = useState("");
  const [resource, setResource] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");

  return (
    <form
      className="form-panel compact-form study-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!topic.trim()) {
          return;
        }

        void onSubmit({
          topic,
          resource: resource || undefined,
          targetDate: targetDate || undefined,
          estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
          status: "planned"
        }).then(() => {
          setTopic("");
          setResource("");
          setTargetDate("");
          setEstimatedHours("");
        });
      }}
    >
      <label>
        주제
        <input value={topic} onChange={(event) => setTopic(event.target.value)} />
      </label>
      <label>
        자료
        <input value={resource} onChange={(event) => setResource(event.target.value)} />
      </label>
      <label>
        목표일
        <input
          type="date"
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value)}
        />
      </label>
      <label>
        예상 시간
        <input
          type="number"
          min="1"
          value={estimatedHours}
          onChange={(event) => setEstimatedHours(event.target.value)}
        />
      </label>
      <button type="submit">공부 추가</button>
    </form>
  );
}
