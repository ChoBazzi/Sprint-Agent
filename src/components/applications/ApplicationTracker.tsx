import { useEffect, useState } from "react";
import type {
  ApplicationStatus,
  JobApplication,
  ResumeVersion
} from "../../domain/applications";
import type {
  CreateJobApplicationPayload,
  CreateResumeVersionPayload,
  JobApplicationListParams,
  UpdateJobApplicationPayload,
  UpdateResumeVersionPayload
} from "../../storage/api-client";

type ApplicationTrackerProps = {
  applications: JobApplication[];
  resumeVersions: ResumeVersion[];
  filters: JobApplicationListParams;
  onChangeFilters: (filters: JobApplicationListParams) => void;
  onCreateApplication: (input: CreateJobApplicationPayload) => Promise<void>;
  onCreateResumeVersion: (input: CreateResumeVersionPayload) => Promise<void>;
  onUpdateResumeVersion: (id: string, input: UpdateResumeVersionPayload) => Promise<void>;
  onUpdateApplication: (id: string, input: UpdateJobApplicationPayload) => Promise<void>;
};

const applicationStatuses: Array<{ value: ApplicationStatus; label: string }> = [
  { value: "interested", label: "관심" },
  { value: "preparing", label: "준비중" },
  { value: "applied", label: "지원완료" },
  { value: "coding_test", label: "코딩테스트" },
  { value: "interview", label: "면접" },
  { value: "offer", label: "오퍼" },
  { value: "rejected", label: "불합격" },
  { value: "archived", label: "보관" }
];

export function ApplicationTracker({
  applications,
  resumeVersions,
  filters,
  onChangeFilters,
  onCreateApplication,
  onCreateResumeVersion,
  onUpdateResumeVersion,
  onUpdateApplication
}: ApplicationTrackerProps) {
  return (
    <section className="section-stack" aria-labelledby="applications-title">
      <div className="section-heading">
        <h2 id="applications-title">Application Tracker</h2>
        <p>회사 지원 현황, 마감일, 다음 액션, 사용 이력서 버전을 함께 관리합니다.</p>
      </div>

      <div className="split-grid">
        <ResumeVersionForm onSubmit={onCreateResumeVersion} />
        <ApplicationForm
          resumeVersions={resumeVersions}
          onSubmit={onCreateApplication}
        />
      </div>

      <div className="resume-version-list" role="list" aria-label="Resume versions">
        {resumeVersions.map((resumeVersion) => (
          <ResumeVersionRow
            resumeVersion={resumeVersion}
            onUpdateResumeVersion={onUpdateResumeVersion}
            key={resumeVersion.id}
          />
        ))}
      </div>

      <ApplicationFilters filters={filters} onChangeFilters={onChangeFilters} />

      <div className="application-list" role="list" aria-label="Job applications">
        {applications.length > 0 ? (
          applications.map((application) => (
            <ApplicationRow
              application={application}
              resumeVersions={resumeVersions}
              onUpdateApplication={onUpdateApplication}
              key={application.id}
            />
          ))
        ) : (
          <p className="empty-copy">아직 등록된 지원건이 없습니다.</p>
        )}
      </div>
    </section>
  );
}

type ResumeVersionRowProps = {
  resumeVersion: ResumeVersion;
  onUpdateResumeVersion: ApplicationTrackerProps["onUpdateResumeVersion"];
};

function ResumeVersionRow({
  resumeVersion,
  onUpdateResumeVersion
}: ResumeVersionRowProps) {
  const [draft, setDraft] = useState({
    name: resumeVersion.name,
    targetRole: resumeVersion.targetRole ?? "",
    changeNotes: resumeVersion.changeNotes ?? ""
  });
  useEffect(() => {
    setDraft({
      name: resumeVersion.name,
      targetRole: resumeVersion.targetRole ?? "",
      changeNotes: resumeVersion.changeNotes ?? ""
    });
  }, [resumeVersion.name, resumeVersion.targetRole, resumeVersion.changeNotes]);
  const hasChanges =
    draft.name !== resumeVersion.name ||
    draft.targetRole !== (resumeVersion.targetRole ?? "") ||
    draft.changeNotes !== (resumeVersion.changeNotes ?? "");

  return (
    <article className="resume-version-row" role="listitem">
      <label>
        버전명
        <input
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
        />
      </label>
      <label>
        목표 직무
        <input
          value={draft.targetRole}
          onChange={(event) =>
            setDraft((current) => ({ ...current, targetRole: event.target.value }))
          }
        />
      </label>
      <label>
        변경 메모
        <input
          value={draft.changeNotes}
          onChange={(event) =>
            setDraft((current) => ({ ...current, changeNotes: event.target.value }))
          }
        />
      </label>
      <button
        type="button"
        disabled={!hasChanges || !draft.name.trim()}
        onClick={() => void onUpdateResumeVersion(resumeVersion.id, draft)}
      >
        저장
      </button>
    </article>
  );
}

type ApplicationRowProps = {
  application: JobApplication;
  resumeVersions: ResumeVersion[];
  onUpdateApplication: ApplicationTrackerProps["onUpdateApplication"];
};

function ApplicationRow({
  application,
  resumeVersions,
  onUpdateApplication
}: ApplicationRowProps) {
  const [draft, setDraft] = useState({
    status: application.status,
    deadline: application.deadline ?? "",
    nextAction: application.nextAction ?? "",
    resumeVersionId: application.resumeVersionId ?? ""
  });
  useEffect(() => {
    setDraft({
      status: application.status,
      deadline: application.deadline ?? "",
      nextAction: application.nextAction ?? "",
      resumeVersionId: application.resumeVersionId ?? ""
    });
  }, [
    application.status,
    application.deadline,
    application.nextAction,
    application.resumeVersionId
  ]);
  const hasChanges =
    draft.status !== application.status ||
    draft.deadline !== (application.deadline ?? "") ||
    draft.nextAction !== (application.nextAction ?? "") ||
    draft.resumeVersionId !== (application.resumeVersionId ?? "");

  return (
    <article className="application-card" role="listitem">
      <div>
        <strong>{application.company}</strong>
        <span>{application.role}</span>
      </div>
      <select
        aria-label={`${application.company} 지원 상태 변경`}
        value={draft.status}
        onChange={(event) =>
          setDraft((current) => ({
            ...current,
            status: event.target.value as ApplicationStatus
          }))
        }
      >
        {applicationStatuses.map((status) => (
          <option value={status.value} key={status.value}>
            {status.label}
          </option>
        ))}
      </select>
      <div>
        <span className="subtle">마감</span>
        <input
          aria-label={`${application.company} 마감일`}
          type="date"
          value={draft.deadline}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              deadline: event.target.value
            }))
          }
        />
      </div>
      <div>
        <span className="subtle">다음 액션</span>
        <input
          aria-label={`${application.company} 다음 액션`}
          value={draft.nextAction}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              nextAction: event.target.value
            }))
          }
        />
      </div>
      <div>
        <span className="subtle">이력서</span>
        <select
          aria-label={`${application.company} 이력서 버전 변경`}
          value={draft.resumeVersionId}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              resumeVersionId: event.target.value
            }))
          }
        >
          <option value="">미연결</option>
          {resumeVersions.map((resumeVersion) => (
            <option value={resumeVersion.id} key={resumeVersion.id}>
              {resumeVersion.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={!hasChanges}
        onClick={() =>
          void onUpdateApplication(application.id, {
            status: draft.status,
            deadline: draft.deadline,
            nextAction: draft.nextAction,
            resumeVersionId: draft.resumeVersionId
          })
        }
      >
        저장
      </button>
    </article>
  );
}

type ApplicationFiltersProps = {
  filters: JobApplicationListParams;
  onChangeFilters: (filters: JobApplicationListParams) => void;
};

function ApplicationFilters({ filters, onChangeFilters }: ApplicationFiltersProps) {
  return (
    <div className="toolbar" aria-label="Application filters">
      <label>
        상태 필터
        <select
          value={filters.status ?? ""}
          onChange={(event) =>
            onChangeFilters({
              ...filters,
              status: event.target.value ? (event.target.value as ApplicationStatus) : undefined
            })
          }
        >
          <option value="">전체</option>
          {applicationStatuses.map((status) => (
            <option value={status.value} key={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={filters.dueWithinDays === 3}
          onChange={(event) =>
            onChangeFilters({
              ...filters,
              dueWithinDays: event.target.checked ? 3 : undefined
            })
          }
        />
        3일 내 마감
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={filters.missingNextAction === true}
          onChange={(event) =>
            onChangeFilters({
              ...filters,
              missingNextAction: event.target.checked || undefined
            })
          }
        />
        다음 액션 없음
      </label>
    </div>
  );
}

type ResumeVersionFormProps = {
  onSubmit: ApplicationTrackerProps["onCreateResumeVersion"];
};

function ResumeVersionForm({ onSubmit }: ResumeVersionFormProps) {
  const [name, setName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [changeNotes, setChangeNotes] = useState("");

  return (
    <form
      className="form-panel"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) {
          return;
        }

        void onSubmit({
          name,
          targetRole: targetRole || undefined,
          changeNotes: changeNotes || undefined
        }).then(() => {
          setName("");
          setTargetRole("");
          setChangeNotes("");
        });
      }}
    >
      <h3 className="form-title">이력서 버전</h3>
      <label>
        버전명
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        목표 직무
        <input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} />
      </label>
      <label>
        변경 메모
        <input value={changeNotes} onChange={(event) => setChangeNotes(event.target.value)} />
      </label>
      <button type="submit">이력서 버전 추가</button>
    </form>
  );
}

type ApplicationFormProps = {
  resumeVersions: ResumeVersion[];
  onSubmit: ApplicationTrackerProps["onCreateApplication"];
};

function ApplicationForm({ resumeVersions, onSubmit }: ApplicationFormProps) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("preparing");
  const [nextAction, setNextAction] = useState("");
  const [resumeVersionId, setResumeVersionId] = useState("");

  return (
    <form
      className="form-panel"
      onSubmit={(event) => {
        event.preventDefault();
        if (!company.trim() || !role.trim()) {
          return;
        }

        void onSubmit({
          company,
          role,
          deadline: deadline || undefined,
          status,
          nextAction: nextAction || undefined,
          resumeVersionId: resumeVersionId || undefined
        }).then(() => {
          setCompany("");
          setRole("");
          setDeadline("");
          setNextAction("");
          setResumeVersionId("");
        });
      }}
    >
      <h3 className="form-title">지원건 추가</h3>
      <div className="form-row">
        <label>
          회사
          <input value={company} onChange={(event) => setCompany(event.target.value)} />
        </label>
        <label>
          직무
          <input value={role} onChange={(event) => setRole(event.target.value)} />
        </label>
      </div>
      <div className="form-row">
        <label>
          상태
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ApplicationStatus)}
          >
            {applicationStatuses.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          마감일
          <input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </label>
      </div>
      <label>
        다음 액션
        <input value={nextAction} onChange={(event) => setNextAction(event.target.value)} />
      </label>
      <label>
        이력서 버전
        <select
          value={resumeVersionId}
          onChange={(event) => setResumeVersionId(event.target.value)}
        >
          <option value="">미연결</option>
          {resumeVersions.map((resumeVersion) => (
            <option value={resumeVersion.id} key={resumeVersion.id}>
              {resumeVersion.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">지원건 추가</button>
    </form>
  );
}
