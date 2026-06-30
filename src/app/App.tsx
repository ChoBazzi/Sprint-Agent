import { useCallback, useEffect, useState } from "react";
import { AssistantPanel } from "../components/assistant/AssistantPanel";
import { CalendarHandoffPanel } from "../components/calendar/CalendarHandoffPanel";
import { DailyCommandCenter } from "../components/dashboard/DailyCommandCenter";
import { ProjectTracker } from "../components/projects/ProjectTracker";
import { SprintBoard } from "../components/sprint/SprintBoard";
import { StudyPlanner } from "../components/study/StudyPlanner";
import type { AssistantResponse } from "../domain/assistant";
import type { CalendarExportResult, CalendarProviderStatus } from "../domain/calendar";
import type { JobApplication } from "../domain/applications";
import type { PortfolioProject } from "../domain/projects";
import type { StudyItem } from "../domain/study";
import type { Sprint, WorkItemStatus } from "../domain/sprint";
import {
  createDailyPlan,
  createGoogleCalendarEvent,
  createProject,
  createProjectReview,
  createSprintReview,
  createSprint,
  createStudyItem,
  createWorkItem,
  deleteWorkItem,
  getActiveSprint,
  getGoogleCalendarAuthUrl,
  getGoogleCalendarStatus,
  listJobApplications,
  listProjects,
  listStudyItems,
  patchProject,
  patchStudyItem,
  patchWorkItem,
  updateWorkItemStatus,
  type CreateCalendarEventPayload,
  type CreateProjectPayload,
  type CreateSprintPayload,
  type CreateStudyItemPayload,
  type PatchProjectPayload,
  type PatchStudyItemPayload,
  type PatchWorkItemPayload,
  type CreateWorkItemPayload
} from "../storage/api-client";

export function App() {
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [studyItems, setStudyItems] = useState<StudyItem[]>([]);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState<AssistantResponse | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<CalendarProviderStatus | null>(null);
  const [calendarResult, setCalendarResult] = useState<CalendarExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshWorkspace = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [activeSprint, jobApplications, studyItemList, projectList] = await Promise.all([
        getActiveSprint(),
        listJobApplications(),
        listStudyItems(),
        listProjects()
      ]);
      setSprint(activeSprint);
      setApplications(jobApplications);
      setStudyItems(studyItemList);
      setProjects(projectList);
    } catch {
      setError("PostgreSQL 또는 API 서버 상태를 확인하세요.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshWorkspace();
  }, [refreshWorkspace]);

  const refreshCalendarStatus = useCallback(async () => {
    try {
      setCalendarStatus(await getGoogleCalendarStatus());
    } catch {
      setCalendarStatus(null);
    }
  }, []);

  useEffect(() => {
    void refreshCalendarStatus();
  }, [refreshCalendarStatus]);

  async function handleCreateSprint(input: CreateSprintPayload) {
    setError(null);
    try {
      setSprint(await createSprint(input));
    } catch {
      setError("Sprint 생성에 실패했습니다.");
    }
  }

  async function handleCreateWorkItem(input: CreateWorkItemPayload) {
    if (!sprint) {
      return;
    }

    setError(null);
    try {
      await createWorkItem({ ...input, sprintId: sprint.id });
      await refreshWorkspace();
    } catch {
      setError("작업 추가에 실패했습니다.");
    }
  }

  async function handleMoveWorkItem(id: string, status: WorkItemStatus) {
    setError(null);
    try {
      await updateWorkItemStatus(id, status);
      await refreshWorkspace();
    } catch {
      setError("작업 상태 변경에 실패했습니다.");
    }
  }

  async function handlePatchWorkItem(id: string, input: PatchWorkItemPayload) {
    setError(null);
    try {
      await patchWorkItem(id, input);
      await refreshWorkspace();
    } catch {
      setError("작업 변경에 실패했습니다.");
    }
  }

  async function handleDeleteWorkItem(id: string) {
    setError(null);
    try {
      await deleteWorkItem(id);
      await refreshWorkspace();
    } catch {
      setError("작업 삭제에 실패했습니다.");
    }
  }

  async function handleCreateStudyItem(input: CreateStudyItemPayload) {
    setError(null);
    try {
      await createStudyItem(input);
      await refreshWorkspace();
    } catch {
      setError("공부 항목 추가에 실패했습니다.");
    }
  }

  async function handlePatchStudyItem(id: string, input: PatchStudyItemPayload) {
    setError(null);
    try {
      await patchStudyItem(id, input);
      await refreshWorkspace();
    } catch {
      setError("공부 항목 변경에 실패했습니다.");
    }
  }

  async function handleCreateProject(input: CreateProjectPayload) {
    setError(null);
    try {
      await createProject(input);
      await refreshWorkspace();
    } catch {
      setError("프로젝트 추가에 실패했습니다.");
    }
  }

  async function handlePatchProject(id: string, input: PatchProjectPayload) {
    setError(null);
    try {
      await patchProject(id, input);
      await refreshWorkspace();
    } catch {
      setError("프로젝트 상태 변경에 실패했습니다.");
    }
  }

  async function handleRequestDailyPlan() {
    await requestAssistantResponse(() =>
      createDailyPlan({
        date: new Date().toISOString().slice(0, 10)
      })
    );
  }

  async function handleRequestSprintReview() {
    await requestAssistantResponse(() => createSprintReview());
  }

  async function handleRequestProjectReview() {
    await requestAssistantResponse(() => createProjectReview());
  }

  async function handleConnectGoogleCalendar() {
    setIsCalendarLoading(true);
    setError(null);

    try {
      window.location.href = await getGoogleCalendarAuthUrl();
    } catch {
      setError("Google Calendar 연결 URL 생성에 실패했습니다.");
      setIsCalendarLoading(false);
    }
  }

  async function handleCreateGoogleCalendarEvent(input: CreateCalendarEventPayload) {
    setIsCalendarLoading(true);
    setError(null);

    try {
      setCalendarResult(await createGoogleCalendarEvent(input));
      await refreshCalendarStatus();
    } catch {
      setError("Google Calendar 이벤트 생성에 실패했습니다.");
    } finally {
      setIsCalendarLoading(false);
    }
  }

  async function requestAssistantResponse(request: () => Promise<AssistantResponse>) {
    setIsAssistantLoading(true);
    setError(null);

    try {
      setAssistantResponse(await request());
    } catch {
      setError("Assistant 제안 생성에 실패했습니다.");
    } finally {
      setIsAssistantLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <DailyCommandCenter
        sprint={sprint}
        applications={applications}
        studyItems={studyItems}
        projects={projects}
        isLoading={isLoading}
        error={error}
        onRetry={refreshWorkspace}
      />
      <div className="execution-grid">
        <AssistantPanel
          response={assistantResponse}
          isLoading={isAssistantLoading}
          onRequestPlan={handleRequestDailyPlan}
          onRequestSprintReview={handleRequestSprintReview}
          onRequestProjectReview={handleRequestProjectReview}
        />
        <CalendarHandoffPanel
          status={calendarStatus}
          result={calendarResult}
          isLoading={isCalendarLoading}
          onConnect={handleConnectGoogleCalendar}
          onCreateEvent={handleCreateGoogleCalendarEvent}
        />
      </div>
      <SprintBoard
        sprint={sprint}
        onCreateSprint={handleCreateSprint}
        onCreateWorkItem={handleCreateWorkItem}
        onMoveWorkItem={handleMoveWorkItem}
        onPatchWorkItem={handlePatchWorkItem}
        onDeleteWorkItem={handleDeleteWorkItem}
      />
      <StudyPlanner
        studyItems={studyItems}
        onCreateStudyItem={handleCreateStudyItem}
        onPatchStudyItem={handlePatchStudyItem}
      />
      <ProjectTracker
        projects={projects}
        onCreateProject={handleCreateProject}
        onPatchProject={handlePatchProject}
      />
    </main>
  );
}
