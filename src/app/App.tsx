import { useCallback, useEffect, useState } from "react";
import { DailyCommandCenter } from "../components/dashboard/DailyCommandCenter";
import { SprintBoard } from "../components/sprint/SprintBoard";
import type { Sprint, WorkItemStatus } from "../domain/sprint";
import {
  createSprint,
  createWorkItem,
  getActiveSprint,
  updateWorkItemStatus,
  type CreateSprintPayload,
  type CreateWorkItemPayload
} from "../storage/api-client";

export function App() {
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSprint = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setSprint(await getActiveSprint());
    } catch {
      setError("PostgreSQL 또는 API 서버 상태를 확인하세요.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSprint();
  }, [refreshSprint]);

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
      await refreshSprint();
    } catch {
      setError("작업 추가에 실패했습니다.");
    }
  }

  async function handleMoveWorkItem(id: string, status: WorkItemStatus) {
    setError(null);
    try {
      await updateWorkItemStatus(id, status);
      await refreshSprint();
    } catch {
      setError("작업 상태 변경에 실패했습니다.");
    }
  }

  return (
    <main className="app-shell">
      <DailyCommandCenter
        sprint={sprint}
        isLoading={isLoading}
        error={error}
        onRetry={refreshSprint}
      />
      <SprintBoard
        sprint={sprint}
        onCreateSprint={handleCreateSprint}
        onCreateWorkItem={handleCreateWorkItem}
        onMoveWorkItem={handleMoveWorkItem}
      />
    </main>
  );
}
