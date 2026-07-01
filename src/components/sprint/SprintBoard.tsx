import { useEffect, useMemo, useState } from "react";
import type { PortfolioProject, ProjectStatus } from "../../domain/projects";
import type { Sprint, WorkArea, WorkItem, WorkItemStatus } from "../../domain/sprint";
import type { StudyItem, StudyStatus } from "../../domain/study";
import type {
  CreateProjectPayload,
  CreateStudyItemPayload,
  PatchProjectPayload,
  PatchStudyItemPayload,
  PatchWorkItemPayload
} from "../../storage/api-client";

type SprintBoardProps = {
  sprint: Sprint | null;
  studyItems: StudyItem[];
  projects: PortfolioProject[];
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
  onCreateStudyItem: (input: CreateStudyItemPayload) => Promise<void>;
  onPatchStudyItem: (id: string, input: PatchStudyItemPayload) => Promise<void>;
  onCreateProject: (input: CreateProjectPayload) => Promise<void>;
  onPatchProject: (id: string, input: PatchProjectPayload) => Promise<void>;
};

type KanbanColumnKey = "planned" | "in_progress" | "blocked" | "reviewing" | "done";

type BoardItem =
  | { id: string; type: "work"; column: KanbanColumnKey; item: WorkItem }
  | { id: string; type: "study"; column: KanbanColumnKey; item: StudyItem }
  | { id: string; type: "project"; column: KanbanColumnKey; item: PortfolioProject };

const kanbanColumns: Array<{ value: KanbanColumnKey; label: string }> = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "reviewing", label: "Review" },
  { value: "done", label: "Done" }
];

const workItemStatuses: Array<{ value: WorkItemStatus; label: string }> = [
  { value: "backlog", label: "Backlog" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "skipped", label: "Skipped" }
];

const studyStatuses: Array<{ value: StudyStatus; label: string }> = [
  { value: "backlog", label: "Backlog" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "reviewing", label: "Reviewing" },
  { value: "done", label: "Done" }
];

const projectStatuses: Array<{ value: ProjectStatus; label: string }> = [
  { value: "idea", label: "Idea" },
  { value: "active", label: "Active" },
  { value: "blocked", label: "Blocked" },
  { value: "polishing", label: "Polishing" },
  { value: "ready", label: "Ready" },
  { value: "archived", label: "Archived" }
];

const readinessFields: Array<{
  key: keyof Pick<
    PortfolioProject,
    "hasReadme" | "hasDemo" | "hasDeployment" | "hasTests" | "portfolioReady"
  >;
  label: string;
}> = [
  { key: "hasReadme", label: "README" },
  { key: "hasDemo", label: "Demo" },
  { key: "hasDeployment", label: "Deploy" },
  { key: "hasTests", label: "Tests" },
  { key: "portfolioReady", label: "Ready" }
];

export function SprintBoard({
  sprint,
  studyItems,
  projects,
  onCreateSprint,
  onCreateWorkItem,
  onMoveWorkItem,
  onPatchWorkItem,
  onDeleteWorkItem,
  onCreateStudyItem,
  onPatchStudyItem,
  onCreateProject,
  onPatchProject
}: SprintBoardProps) {
  const [editingItem, setEditingItem] = useState<BoardItem | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const boardItems = useMemo(
    () => buildBoardItems(sprint?.workItems ?? [], studyItems, projects),
    [sprint?.workItems, studyItems, projects]
  );

  async function handleDrop(itemId: string, column: KanbanColumnKey) {
    const item = boardItems.find((candidate) => candidate.id === itemId);
    if (!item || item.column === column) {
      return;
    }

    if (item.type === "work") {
      await onMoveWorkItem(item.item.id, mapColumnToWorkItemStatus(column));
      return;
    }

    if (item.type === "study") {
      await onPatchStudyItem(item.item.id, { status: mapColumnToStudyStatus(column) });
      return;
    }

    await onPatchProject(item.item.id, { status: mapColumnToProjectStatus(column) });
  }

  return (
    <section className="section-stack" aria-labelledby="sprint-title">
      <div className="section-heading">
        <div>
          <h2 id="sprint-title">Kanban Board</h2>
          <p>Sprint 작업, 공부 항목, 포트폴리오 프로젝트를 흐름별로 관리합니다.</p>
        </div>
        <div className="board-summary" aria-label="Kanban summary">
          <span>작업 {sprint?.workItems.length ?? 0}</span>
          <span>공부 {studyItems.length}</span>
          <span>프로젝트 {projects.length}</span>
        </div>
      </div>

      {sprint ? (
        <>
          <div className="quick-create-grid">
            <WorkItemForm onSubmit={onCreateWorkItem} />
            <StudyItemForm onSubmit={onCreateStudyItem} />
            <ProjectForm onSubmit={onCreateProject} />
          </div>
          <div className="board" role="list" aria-label="Kanban board">
            {kanbanColumns.map((column) => {
              const columnItems = boardItems.filter((item) => item.column === column.value);
              return (
                <section
                  className="board-column"
                  key={column.value}
                  aria-labelledby={`${column.value}-title`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const itemId = event.dataTransfer.getData("text/plain") || draggedItemId;
                    if (itemId) {
                      void handleDrop(itemId, column.value);
                    }
                    setDraggedItemId(null);
                  }}
                >
                  <div className="column-title">
                    <h3 id={`${column.value}-title`}>{column.label}</h3>
                    <span>{columnItems.length}</span>
                  </div>
                  <div className="task-stack">
                    {columnItems.map((item) => (
                      <BoardCard
                        item={item}
                        onEdit={setEditingItem}
                        onDragStart={setDraggedItemId}
                        key={item.id}
                      />
                    ))}
                    {columnItems.length === 0 ? <p className="empty-column">비어 있음</p> : null}
                  </div>
                </section>
              );
            })}
          </div>
          {editingItem ? (
            <DetailPanel
              item={editingItem}
              onClose={() => setEditingItem(null)}
              onMoveWorkItem={onMoveWorkItem}
              onPatchWorkItem={onPatchWorkItem}
              onDeleteWorkItem={onDeleteWorkItem}
              onPatchStudyItem={onPatchStudyItem}
              onPatchProject={onPatchProject}
            />
          ) : null}
        </>
      ) : (
        <SprintForm onSubmit={onCreateSprint} />
      )}
    </section>
  );
}

function BoardCard({
  item,
  onEdit,
  onDragStart
}: {
  item: BoardItem;
  onEdit: (item: BoardItem) => void;
  onDragStart: (id: string) => void;
}) {
  return (
    <article
      className={`task-card task-card-${item.type}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.id);
        onDragStart(item.id);
      }}
      onDragEnd={() => onDragStart("")}
    >
      <div className="task-card-title">
        <span className="task-type">{getItemTypeLabel(item)}</span>
        <strong>{getItemTitle(item)}</strong>
      </div>
      <span>{getItemMeta(item)}</span>
      <button type="button" className="button-secondary" onClick={() => onEdit(item)}>
        자세히
      </button>
    </article>
  );
}

function DetailPanel({
  item,
  onClose,
  onMoveWorkItem,
  onPatchWorkItem,
  onDeleteWorkItem,
  onPatchStudyItem,
  onPatchProject
}: {
  item: BoardItem;
  onClose: () => void;
  onMoveWorkItem: SprintBoardProps["onMoveWorkItem"];
  onPatchWorkItem: SprintBoardProps["onPatchWorkItem"];
  onDeleteWorkItem: SprintBoardProps["onDeleteWorkItem"];
  onPatchStudyItem: SprintBoardProps["onPatchStudyItem"];
  onPatchProject: SprintBoardProps["onPatchProject"];
}) {
  return (
    <div className="detail-backdrop">
      <section className="detail-panel" role="dialog" aria-modal="true" aria-label={`${getItemTitle(item)} 상세 수정`}>
        <div className="detail-panel-header">
          <div>
            <span className="task-type">{getItemTypeLabel(item)}</span>
            <h3>{getItemTitle(item)}</h3>
          </div>
          <button type="button" className="button-secondary" onClick={onClose}>
            닫기
          </button>
        </div>
        {item.type === "work" ? (
          <WorkItemDetail
            item={item.item}
            onMoveWorkItem={onMoveWorkItem}
            onPatchWorkItem={onPatchWorkItem}
            onDeleteWorkItem={onDeleteWorkItem}
            onClose={onClose}
          />
        ) : null}
        {item.type === "study" ? (
          <StudyItemDetail item={item.item} onPatchStudyItem={onPatchStudyItem} onClose={onClose} />
        ) : null}
        {item.type === "project" ? (
          <ProjectDetail project={item.item} onPatchProject={onPatchProject} onClose={onClose} />
        ) : null}
      </section>
    </div>
  );
}

function WorkItemDetail({
  item,
  onMoveWorkItem,
  onPatchWorkItem,
  onDeleteWorkItem,
  onClose
}: {
  item: WorkItem;
  onMoveWorkItem: SprintBoardProps["onMoveWorkItem"];
  onPatchWorkItem: SprintBoardProps["onPatchWorkItem"];
  onDeleteWorkItem: SprintBoardProps["onDeleteWorkItem"];
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({
    title: item.title,
    status: item.status,
    priority: item.priority,
    dueDate: item.dueDate ?? ""
  });

  return (
    <form
      className="detail-form"
      onSubmit={(event) => {
        event.preventDefault();
        void Promise.all([
          onPatchWorkItem(item.id, {
            title: draft.title,
            priority: draft.priority,
            dueDate: draft.dueDate
          }),
          draft.status !== item.status ? onMoveWorkItem(item.id, draft.status) : Promise.resolve()
        ]).then(onClose);
      }}
    >
      <label>
        작업명
        <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
      </label>
      <div className="form-row">
        <label>
          상태
          <select
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as WorkItemStatus }))}
          >
            {workItemStatuses.map((status) => (
              <option value={status.value} key={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          우선순위
          <select
            value={draft.priority}
            onChange={(event) =>
              setDraft((current) => ({ ...current, priority: Number(event.target.value) as 1 | 2 | 3 }))
            }
          >
            <option value={1}>Low</option>
            <option value={2}>Medium</option>
            <option value={3}>High</option>
          </select>
        </label>
      </div>
      <label>
        마감
        <input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} />
      </label>
      <div className="detail-actions">
        <button type="submit" disabled={!draft.title.trim()}>
          저장
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => void onDeleteWorkItem(item.id).then(onClose)}
        >
          삭제
        </button>
      </div>
    </form>
  );
}

function StudyItemDetail({
  item,
  onPatchStudyItem,
  onClose
}: {
  item: StudyItem;
  onPatchStudyItem: SprintBoardProps["onPatchStudyItem"];
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({
    topic: item.topic,
    resource: item.resource ?? "",
    status: item.status,
    targetDate: item.targetDate ?? "",
    progress: String(item.progress),
    reviewDate: item.reviewDate ?? ""
  });

  return (
    <form
      className="detail-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onPatchStudyItem(item.id, {
          topic: draft.topic,
          resource: draft.resource,
          status: draft.status,
          targetDate: draft.targetDate,
          progress: Number(draft.progress),
          reviewDate: draft.reviewDate
        }).then(onClose);
      }}
    >
      <label>
        주제
        <input value={draft.topic} onChange={(event) => setDraft((current) => ({ ...current, topic: event.target.value }))} />
      </label>
      <label>
        자료
        <input value={draft.resource} onChange={(event) => setDraft((current) => ({ ...current, resource: event.target.value }))} />
      </label>
      <div className="form-row">
        <label>
          상태
          <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as StudyStatus }))}>
            {studyStatuses.map((status) => (
              <option value={status.value} key={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          진행률
          <input type="number" min="0" max="100" value={draft.progress} onChange={(event) => setDraft((current) => ({ ...current, progress: event.target.value }))} />
        </label>
      </div>
      <div className="form-row">
        <label>
          목표일
          <input type="date" value={draft.targetDate} onChange={(event) => setDraft((current) => ({ ...current, targetDate: event.target.value }))} />
        </label>
        <label>
          복습일
          <input type="date" value={draft.reviewDate} onChange={(event) => setDraft((current) => ({ ...current, reviewDate: event.target.value }))} />
        </label>
      </div>
      <button type="submit" disabled={!draft.topic.trim()}>
        저장
      </button>
    </form>
  );
}

function ProjectDetail({
  project,
  onPatchProject,
  onClose
}: {
  project: PortfolioProject;
  onPatchProject: SprintBoardProps["onPatchProject"];
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({
    status: project.status,
    nextAction: project.nextAction ?? ""
  });

  return (
    <form
      className="detail-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onPatchProject(project.id, {
          status: draft.status,
          nextAction: draft.nextAction
        }).then(onClose);
      }}
    >
      <p className="detail-copy">{project.goal}</p>
      <label>
        상태
        <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ProjectStatus }))}>
          {projectStatuses.map((status) => (
            <option value={status.value} key={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        다음 액션
        <input value={draft.nextAction} onChange={(event) => setDraft((current) => ({ ...current, nextAction: event.target.value }))} />
      </label>
      <div className="readiness-list">
        {readinessFields.map((field) => (
          <label className="check-row" key={field.key}>
            <input
              type="checkbox"
              checked={project[field.key]}
              onChange={(event) =>
                void onPatchProject(project.id, {
                  [field.key]: event.target.checked
                })
              }
            />
            {field.label}
          </label>
        ))}
      </div>
      <button type="submit">저장</button>
    </form>
  );
}

function buildBoardItems(
  workItems: WorkItem[],
  studyItems: StudyItem[],
  projects: PortfolioProject[]
): BoardItem[] {
  return [
    ...workItems
      .filter((item) => item.status !== "backlog" && item.status !== "skipped")
      .map((item) => ({
        id: `work-${item.id}`,
        type: "work" as const,
        column: mapWorkItemStatus(item.status),
        item
      })),
    ...studyItems
      .filter((item) => item.status !== "backlog")
      .map((item) => ({
        id: `study-${item.id}`,
        type: "study" as const,
        column: mapStudyStatus(item.status),
        item
      })),
    ...projects
      .filter((item) => item.status !== "idea" && item.status !== "archived")
      .map((item) => ({
        id: `project-${item.id}`,
        type: "project" as const,
        column: mapProjectStatus(item.status),
        item
      }))
  ];
}

function mapWorkItemStatus(status: WorkItemStatus): KanbanColumnKey {
  if (status === "done") return "done";
  if (status === "blocked") return "blocked";
  if (status === "in_progress") return "in_progress";
  return "planned";
}

function mapStudyStatus(status: StudyStatus): KanbanColumnKey {
  if (status === "done") return "done";
  if (status === "reviewing") return "reviewing";
  if (status === "in_progress") return "in_progress";
  return "planned";
}

function mapProjectStatus(status: ProjectStatus): KanbanColumnKey {
  if (status === "ready") return "done";
  if (status === "blocked") return "blocked";
  if (status === "polishing") return "reviewing";
  return "in_progress";
}

function mapColumnToWorkItemStatus(column: KanbanColumnKey): WorkItemStatus {
  if (column === "done") return "done";
  if (column === "blocked") return "blocked";
  if (column === "in_progress" || column === "reviewing") return "in_progress";
  return "planned";
}

function mapColumnToStudyStatus(column: KanbanColumnKey): StudyStatus {
  if (column === "done") return "done";
  if (column === "reviewing") return "reviewing";
  if (column === "in_progress" || column === "blocked") return "in_progress";
  return "planned";
}

function mapColumnToProjectStatus(column: KanbanColumnKey): ProjectStatus {
  if (column === "done") return "ready";
  if (column === "blocked") return "blocked";
  if (column === "reviewing") return "polishing";
  return "active";
}

function getItemTypeLabel(item: BoardItem): string {
  if (item.type === "work") return "Sprint";
  if (item.type === "study") return "Study";
  return "Project";
}

function getItemTitle(item: BoardItem): string {
  if (item.type === "work") return item.item.title;
  if (item.type === "study") return item.item.topic;
  return item.item.name;
}

function getItemMeta(item: BoardItem): string {
  if (item.type === "work") return `${formatArea(item.item.area)} · ${formatPriority(item.item.priority)}`;
  if (item.type === "study") return `진행률 ${item.item.progress}%`;
  return item.item.nextAction ?? item.item.goal;
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

  return (
    <form
      className="form-panel compact-form task-create-form"
      aria-label="Sprint 작업 추가"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) {
          return;
        }

        void onSubmit({ title, area, priority: 2, status: "planned" }).then(() => setTitle(""));
      }}
    >
      <h3 className="form-title">Sprint 작업</h3>
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
      <button type="submit">작업 추가</button>
    </form>
  );
}

type StudyItemFormProps = {
  onSubmit: SprintBoardProps["onCreateStudyItem"];
};

function StudyItemForm({ onSubmit }: StudyItemFormProps) {
  const [topic, setTopic] = useState("");
  const [targetDate, setTargetDate] = useState("");

  return (
    <form
      className="form-panel compact-form study-create-form"
      aria-label="공부 항목 추가"
      onSubmit={(event) => {
        event.preventDefault();
        if (!topic.trim()) {
          return;
        }

        void onSubmit({
          topic,
          targetDate: targetDate || undefined,
          status: "planned"
        }).then(() => {
          setTopic("");
          setTargetDate("");
        });
      }}
    >
      <h3 className="form-title">Study</h3>
      <label>
        주제
        <input value={topic} onChange={(event) => setTopic(event.target.value)} />
      </label>
      <label>
        목표일
        <input
          type="date"
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value)}
        />
      </label>
      <button type="submit">공부 추가</button>
    </form>
  );
}

type ProjectFormProps = {
  onSubmit: SprintBoardProps["onCreateProject"];
};

function ProjectForm({ onSubmit }: ProjectFormProps) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");

  return (
    <form
      className="form-panel compact-form project-create-form"
      aria-label="프로젝트 추가"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim() || !goal.trim()) {
          return;
        }

        void onSubmit({
          name,
          goal,
          status: "active"
        }).then(() => {
          setName("");
          setGoal("");
        });
      }}
    >
      <h3 className="form-title">Project</h3>
      <label>
        프로젝트
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        목표
        <input value={goal} onChange={(event) => setGoal(event.target.value)} />
      </label>
      <button type="submit">프로젝트 추가</button>
    </form>
  );
}

function formatArea(area: WorkArea): string {
  const labels: Record<WorkArea, string> = {
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
