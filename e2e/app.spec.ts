import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "오늘의 커맨드 센터" })).toBeVisible();
});

test("renders seeded workspace data", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "지금 먼저 할 일" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Application Tracker" })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Job applications" })).toHaveCount(0);

  await expect(page.getByRole("heading", { name: "달력" })).toBeVisible();
  const calendarGrid = page.getByRole("grid", { name: /달력/ });
  await expect(calendarGrid).toBeVisible();
  await expect(calendarGrid.getByText("Wanted Labs")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Google Calendar Handoff" })).toBeVisible();
  await expect(page.getByText(/환경 설정 필요|미연결|연결됨/)).toBeVisible();

  await expect(page.getByRole("heading", { name: "Kanban Board" })).toBeVisible();
  const kanbanBoard = page.getByRole("list", { name: "Kanban board" });
  await expect(kanbanBoard.getByText("네트워크 면접 질문", { exact: true })).toBeVisible();
  await expect(kanbanBoard.getByText("Developer Job-Prep Assistant")).toBeVisible();
});

test("creates, edits, and deletes a sprint work item", async ({ page }) => {
  const title = `E2E 작업 ${Date.now()}`;
  const updatedTitle = `${title} 수정`;
  const sprintSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Kanban Board" }) });
  const createForm = sprintSection.getByRole("form", { name: "Sprint 작업 추가" });

  await createForm.getByLabel("작업명").fill(title);
  await createForm.getByLabel("영역").selectOption("project");
  await createForm.getByRole("button", { name: "작업 추가" }).click();

  const card = sprintSection.locator("article.task-card").filter({ hasText: title });
  await expect(card).toBeVisible();

  const inProgressColumn = sprintSection
    .locator("section.board-column")
    .filter({ has: page.getByRole("heading", { name: "In Progress" }) });
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await card.dispatchEvent("dragstart", { dataTransfer });
  await inProgressColumn.dispatchEvent("dragover", { dataTransfer });
  await inProgressColumn.dispatchEvent("drop", { dataTransfer });
  await card.dispatchEvent("dragend", { dataTransfer });
  await expect(inProgressColumn.getByText(title)).toBeVisible();

  await inProgressColumn.locator("article.task-card").filter({ hasText: title }).getByRole("button", { name: "자세히" }).click();
  const dialog = page.getByRole("dialog", { name: new RegExp(title) });
  await expect(dialog.getByRole("button", { name: "캘린더 반영" })).toBeVisible();
  await dialog.getByLabel("작업명").fill(updatedTitle);
  await dialog.getByLabel("우선순위").selectOption("1");
  await dialog.getByRole("button", { name: "저장" }).click();

  const updatedCard = sprintSection.locator("article.task-card").filter({ hasText: updatedTitle });
  await expect(updatedCard).toBeVisible();

  await updatedCard.getByRole("button", { name: "자세히" }).click();
  await page.getByRole("dialog", { name: new RegExp(updatedTitle) }).getByRole("button", { name: "삭제" }).click();
  await expect(updatedCard).toHaveCount(0);
});

test("creates study and project items, then verifies the assistant status board", async ({ page }) => {
  const study = `E2E Study ${Date.now()}`;
  const kanbanSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Kanban Board" }) });
  const studyForm = kanbanSection.getByRole("form", { name: "공부 항목 추가" });

  await studyForm.getByLabel("주제").fill(study);
  await studyForm.getByRole("button", { name: "공부 추가" }).click();
  const studyCard = kanbanSection.locator("article.task-card").filter({ hasText: study });
  await expect(studyCard).toBeVisible();

  const project = `E2E Project ${Date.now()}`;
  const projectForm = kanbanSection.getByRole("form", { name: "프로젝트 추가" });

  await projectForm.getByLabel("프로젝트").fill(project);
  await projectForm.getByLabel("목표").fill("E2E smoke flow");
  await projectForm.getByRole("button", { name: "프로젝트 추가" }).click();
  const projectCard = kanbanSection.locator("article.task-card").filter({ hasText: project });
  await expect(projectCard).toBeVisible();

  await studyCard.getByRole("button", { name: "자세히" }).click();
  await page.getByRole("dialog", { name: new RegExp(study) }).getByRole("button", { name: "삭제" }).click();
  await expect(studyCard).toHaveCount(0);

  await projectCard.getByRole("button", { name: "자세히" }).click();
  await page.getByRole("dialog", { name: new RegExp(project) }).getByRole("button", { name: "삭제" }).click();
  await expect(projectCard).toHaveCount(0);

  await expect(page.getByRole("heading", { name: "Codex CLI 상태판" })).toBeVisible();
  await expect(page.getByRole("button", { name: "새로고침" })).toBeVisible();
  await page.getByRole("button", { name: "MCP 로그 보기" }).click();
  await expect(page.getByRole("dialog", { name: "MCP 작업 로그" })).toBeVisible();
  await expect(page.getByLabel("Assistant tracked actions")).toBeVisible();
});
