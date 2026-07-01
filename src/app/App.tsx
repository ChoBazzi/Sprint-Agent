import { useCallback, useEffect, useState } from "react";
import { AssistantPanel } from "../components/assistant/AssistantPanel";
import { CalendarBoard } from "../components/calendar/CalendarBoard";
import { CalendarHandoffPanel } from "../components/calendar/CalendarHandoffPanel";
import { DailyCommandCenter } from "../components/dashboard/DailyCommandCenter";
import { SprintBoard } from "../components/sprint/SprintBoard";
import type { AssistantConversationDetail } from "../domain/assistant-chat";
import type { CalendarExportResult, CalendarProviderStatus } from "../domain/calendar";
import type { JobApplication } from "../domain/applications";
import type { PortfolioProject } from "../domain/projects";
import type { StudyItem } from "../domain/study";
import type { Sprint, WorkItemStatus } from "../domain/sprint";
import {
  applyAssistantAction,
  approveAssistantAction,
  createGoogleCalendarEvent,
  createProject,
  createSprint,
  createStudyItem,
  createWorkItem,
  deleteWorkItem,
  getActiveSprint,
  getAssistantConversation,
  getGoogleCalendarAuthUrl,
  getGoogleCalendarStatus,
  listJobApplications,
  listAssistantConversations,
  listProjects,
  listStudyItems,
  patchProject,
  patchStudyItem,
  patchWorkItem,
  rejectAssistantAction,
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
  const [assistantDetail, setAssistantDetail] = useState<AssistantConversationDetail | null>(null);
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

  const refreshAssistantConversation = useCallback(async (conversationId: string) => {
    setAssistantDetail(await getAssistantConversation(conversationId));
  }, []);

  const loadLatestAssistantConversation = useCallback(async () => {
    const conversations = await listAssistantConversations();
    if (conversations[0]) {
      setAssistantDetail(await getAssistantConversation(conversations[0].id));
      return;
    }

    setAssistantDetail(null);
  }, []);

  useEffect(() => {
    async function loadSafely() {
      try {
        await loadLatestAssistantConversation();
      } catch {
        setAssistantDetail(null);
      }
    }

    void loadSafely();
    const intervalId = window.setInterval(() => {
      void loadSafely();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [loadLatestAssistantConversation]);

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

  async function handleRefreshAssistantState() {
    setIsAssistantLoading(true);
    setError(null);

    try {
      await loadLatestAssistantConversation();
    } catch {
      setError("Assistant 상태를 불러오지 못했습니다.");
    } finally {
      setIsAssistantLoading(false);
    }
  }

  async function handleApproveAssistantAction(id: string) {
    await updateAssistantAction(() => approveAssistantAction(id));
  }

  async function handleRejectAssistantAction(id: string) {
    await updateAssistantAction(() => rejectAssistantAction(id));
  }

  async function handleApplyAssistantAction(id: string) {
    await updateAssistantAction(() => applyAssistantAction(id));
    await refreshCalendarStatus();
  }

  async function updateAssistantAction(action: () => Promise<unknown>) {
    if (!assistantDetail) {
      return;
    }

    setIsAssistantLoading(true);
    setError(null);
    try {
      await action();
      await refreshAssistantConversation(assistantDetail.conversation.id);
    } catch {
      setError("Assistant 작업 상태 변경에 실패했습니다.");
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
      <AssistantPanel
        detail={assistantDetail}
        isLoading={isAssistantLoading}
        onRefresh={handleRefreshAssistantState}
        onApproveAction={handleApproveAssistantAction}
        onRejectAction={handleRejectAssistantAction}
        onApplyAction={handleApplyAssistantAction}
      />
      <section className="workspace-shell" aria-labelledby="workspace-title">
        <div className="section-heading">
          <div>
            <h2 id="workspace-title">작업 관리</h2>
            <p>캘린더로 날짜를 확인하고, 아래 칸반보드에서 공부와 프로젝트까지 함께 관리합니다.</p>
          </div>
        </div>

        <div className="workspace-panel">
          <div className="calendar-workspace">
            <CalendarBoard
              sprint={sprint}
              applications={applications}
              studyItems={studyItems}
              assistantActions={assistantDetail?.actions ?? []}
            />
            <CalendarHandoffPanel
              status={calendarStatus}
              result={calendarResult}
              isLoading={isCalendarLoading}
              onConnect={handleConnectGoogleCalendar}
              onCreateEvent={handleCreateGoogleCalendarEvent}
            />
            <SprintBoard
              sprint={sprint}
              studyItems={studyItems}
              projects={projects}
              onCreateSprint={handleCreateSprint}
              onCreateWorkItem={handleCreateWorkItem}
              onMoveWorkItem={handleMoveWorkItem}
              onPatchWorkItem={handlePatchWorkItem}
              onDeleteWorkItem={handleDeleteWorkItem}
              onCreateStudyItem={handleCreateStudyItem}
              onPatchStudyItem={handlePatchStudyItem}
              onCreateProject={handleCreateProject}
              onPatchProject={handlePatchProject}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
