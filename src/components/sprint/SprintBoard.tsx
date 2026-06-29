import { useEffect, useState } from "react";
import type { Sprint, WorkArea, WorkItem, WorkItemStatus } from "../../domain/sprint";
import type { PatchWorkItemPayload } from "../../storage/api-client";

type SprintBoardProps = {
  sprint: Sprint | null;
  onCreateSprint: (input: {
    name: string;
    goal: string;
    startsOn: string;
    endsOn: string;
    capacity?: number;
  }) => Promise<void>;
  onCreateWorkItem: (input: {
    title: string;
    area: WorkArea;
    priority: 1 | 2 | 3;
    status: WorkItemStatus;
  }) => Promise<void>;
  onMoveWorkItem: (id: string, status: WorkItemStatus) => Promise<void>;
  onPatchWorkItem: (id: string, input: PatchWorkItemPayload) => Promise<void>;
  onDeleteWorkItem: (id: string) => Promise<void>;
};

const statuses: Array<{ value: WorkItemStatus; label: string }> = [
  { value: "backlog", label: "Backlog" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "skipped", label: "Skipped" }
];

export function SprintBoard({
  sprint,
  onCreateSprint,
  onCreateWorkItem,
  onMoveWorkItem,
  onPatchWorkItem,
  onDeleteWorkItem
}: SprintBoardProps) {
  return (
    <section className="section-stack" aria-labelledby="sprint-title">
      <div className="section-heading">
        <h2 id="sprint-title">Sprint Board</h2>
        <p>이번 Sprint의 작업을 상태별로 관리합니다.</p>
      </div>

      {sprint ? (
        <>
          <WorkItemForm onSubmit={onCreateWorkItem} />
          <div className="board" role="list" aria-label="Sprint work item board">
            {statuses.map((status) => (
              <section className="board-column" key={status.value} aria-labelledby={`${status.value}-title`}>
                <div className="column-title">
                  <h3 id={`${status.value}-title`}>{status.label}</h3>
                  <span>{sprint.workItems.filter((item) => item.status === status.value).length}</span>
                </div>
                <div className="task-stack">
                  {sprint.workItems
                    .filter((item) => item.status === status.value)
                    .map((item) => (
                      <WorkItemCard
                        item={item}
                        onMoveWorkItem={onMoveWorkItem}
                        onPatchWorkItem={onPatchWorkItem}
                        onDeleteWorkItem={onDeleteWorkItem}
                        key={item.id}
                      />
                    ))}
                  {sprint.workItems.filter((item) => item.status === status.value).length === 0 ? (
                    <p className="empty-column">비어 있음</p>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <SprintForm onSubmit={onCreateSprint} />
      )}
    </section>
  );
}

type WorkItemCardProps = {
  item: WorkItem;
  onMoveWorkItem: SprintBoardProps["onMoveWorkItem"];
  onPatchWorkItem: SprintBoardProps["onPatchWorkItem"];
  onDeleteWorkItem: SprintBoardProps["onDeleteWorkItem"];
};

function WorkItemCard({
  item,
  onMoveWorkItem,
  onPatchWorkItem,
  onDeleteWorkItem
}: WorkItemCardProps) {
  const [draft, setDraft] = useState({
    title: item.title,
    priority: item.priority,
    dueDate: item.dueDate ?? ""
  });
  useEffect(() => {
    setDraft({
      title: item.title,
      priority: item.priority,
      dueDate: item.dueDate ?? ""
    });
  }, [item.title, item.priority, item.dueDate]);
  const hasChanges =
    draft.title !== item.title ||
    draft.priority !== item.priority ||
    draft.dueDate !== (item.dueDate ?? "");

  return (
    <article className="task-card">
      <label>
        작업명
        <input
          value={draft.title}
          onChange={(event) =>
            setDraft((current) => ({ ...current, title: event.target.value }))
          }
        />
      </label>
      <span>{item.area}</span>
      <select
        aria-label={`${item.title} 상태 변경`}
        value={item.status}
        onChange={(event) =>
          void onMoveWorkItem(item.id, event.target.value as WorkItemStatus)
        }
      >
        {statuses.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="task-card-controls">
        <label>
          마감
          <input
            type="date"
            value={draft.dueDate}
            onChange={(event) =>
              setDraft((current) => ({ ...current, dueDate: event.target.value }))
            }
          />
        </label>
        <label>
          우선순위
          <select
            value={draft.priority}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                priority: Number(event.target.value) as 1 | 2 | 3
              }))
            }
          >
            <option value={1}>Low</option>
            <option value={2}>Medium</option>
            <option value={3}>High</option>
          </select>
        </label>
      </div>
      <div className="task-card-actions">
        <button
          type="button"
          disabled={!hasChanges || !draft.title.trim()}
          onClick={() =>
            void onPatchWorkItem(item.id, {
              title: draft.title,
              priority: draft.priority,
              dueDate: draft.dueDate
            })
          }
        >
          저장
        </button>
        <button type="button" className="button-secondary" onClick={() => void onDeleteWorkItem(item.id)}>
          삭제
        </button>
      </div>
    </article>
  );
}

type SprintFormProps = {
  onSubmit: SprintBoardProps["onCreateSprint"];
};

function SprintForm({ onSubmit }: SprintFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("이번 주 Sprint");
  const [goal, setGoal] = useState("취업 준비 루틴 안정화");
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(today);

  return (
    <form
      className="form-panel"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({ name, goal, startsOn, endsOn });
      }}
    >
      <label>
        Sprint 이름
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        목표
        <input value={goal} onChange={(event) => setGoal(event.target.value)} />
      </label>
      <div className="form-row">
        <label>
          시작일
          <input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} />
        </label>
        <label>
          종료일
          <input type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
        </label>
      </div>
      <button type="submit">Sprint 만들기</button>
    </form>
  );
}

type WorkItemFormProps = {
  onSubmit: SprintBoardProps["onCreateWorkItem"];
};

function WorkItemForm({ onSubmit }: WorkItemFormProps) {
  const [title, setTitle] = useState("");
  const [area, setArea] = useState<WorkArea>("study");
  const [priority, setPriority] = useState<1 | 2 | 3>(2);

  return (
    <form
      className="form-panel compact-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) {
          return;
        }

        void onSubmit({ title, area, priority, status: "planned" }).then(() => setTitle(""));
      }}
    >
      <label>
        작업명
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        영역
        <select value={area} onChange={(event) => setArea(event.target.value as WorkArea)}>
          <option value="study">Study</option>
          <option value="application">Application</option>
          <option value="project">Project</option>
          <option value="personal">Personal</option>
        </select>
      </label>
      <label>
        우선순위
        <select
          value={priority}
          onChange={(event) => setPriority(Number(event.target.value) as 1 | 2 | 3)}
        >
          <option value={1}>Low</option>
          <option value={2}>Medium</option>
          <option value={3}>High</option>
        </select>
      </label>
      <button type="submit">작업 추가</button>
    </form>
  );
}
