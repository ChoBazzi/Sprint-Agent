import { useEffect, useState } from "react";
import type { PortfolioProject, ProjectStatus } from "../../domain/projects";
import type { CreateProjectPayload, PatchProjectPayload } from "../../storage/api-client";

type ProjectTrackerProps = {
  projects: PortfolioProject[];
  onCreateProject: (input: CreateProjectPayload) => Promise<void>;
  onPatchProject: (id: string, input: PatchProjectPayload) => Promise<void>;
};

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

export function ProjectTracker({
  projects,
  onCreateProject,
  onPatchProject
}: ProjectTrackerProps) {
  return (
    <section className="section-stack" aria-labelledby="projects-title">
      <div className="section-heading">
        <h2 id="projects-title">Portfolio Projects</h2>
        <p>프로젝트의 포트폴리오 준비 상태와 다음 액션을 추적합니다.</p>
      </div>

      <ProjectForm onSubmit={onCreateProject} />

      <div className="project-grid" role="list" aria-label="Portfolio projects">
        {projects.length > 0 ? (
          projects.map((project) => (
            <ProjectCard project={project} onPatchProject={onPatchProject} key={project.id} />
          ))
        ) : (
          <p className="empty-copy">아직 등록된 포트폴리오 프로젝트가 없습니다.</p>
        )}
      </div>
    </section>
  );
}

type ProjectCardProps = {
  project: PortfolioProject;
  onPatchProject: ProjectTrackerProps["onPatchProject"];
};

function ProjectCard({ project, onPatchProject }: ProjectCardProps) {
  const [draft, setDraft] = useState({
    status: project.status,
    nextAction: project.nextAction ?? ""
  });
  useEffect(() => {
    setDraft({
      status: project.status,
      nextAction: project.nextAction ?? ""
    });
  }, [project.status, project.nextAction]);
  const hasChanges =
    draft.status !== project.status || draft.nextAction !== (project.nextAction ?? "");

  return (
    <article className="project-card" role="listitem">
      <div className="project-card-header">
        <div>
          <strong>{project.name}</strong>
          <span>{project.goal}</span>
        </div>
        <select
          aria-label={`${project.name} 상태 변경`}
          value={draft.status}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              status: event.target.value as ProjectStatus
            }))
          }
        >
          {projectStatuses.map((status) => (
            <option value={status.value} key={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>
      <label>
        다음 액션
        <input
          value={draft.nextAction}
          onChange={(event) =>
            setDraft((current) => ({ ...current, nextAction: event.target.value }))
          }
        />
      </label>
      <button
        type="button"
        disabled={!hasChanges}
        onClick={() =>
          void onPatchProject(project.id, {
            status: draft.status,
            nextAction: draft.nextAction
          })
        }
      >
        상태 저장
      </button>
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
    </article>
  );
}

type ProjectFormProps = {
  onSubmit: ProjectTrackerProps["onCreateProject"];
};

function ProjectForm({ onSubmit }: ProjectFormProps) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [stack, setStack] = useState("");
  const [nextAction, setNextAction] = useState("");

  return (
    <form
      className="form-panel compact-form project-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim() || !goal.trim()) {
          return;
        }

        void onSubmit({
          name,
          goal,
          stack: stack || undefined,
          nextAction: nextAction || undefined,
          status: "active"
        }).then(() => {
          setName("");
          setGoal("");
          setStack("");
          setNextAction("");
        });
      }}
    >
      <label>
        프로젝트
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        목표
        <input value={goal} onChange={(event) => setGoal(event.target.value)} />
      </label>
      <label>
        스택
        <input value={stack} onChange={(event) => setStack(event.target.value)} />
      </label>
      <label>
        다음 액션
        <input value={nextAction} onChange={(event) => setNextAction(event.target.value)} />
      </label>
      <button type="submit">프로젝트 추가</button>
    </form>
  );
}
