import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "오늘의 커맨드 센터" })).toBeVisible();
});

test("renders seeded workspace data", async ({ page }) => {
  await expect(page.getByText("취업 준비 Sprint")).toBeVisible();
  await expect(page.getByRole("list", { name: "Study items" }).getByText("네트워크 면접 질문")).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Portfolio projects" }).getByText("Developer Job-Prep Assistant")
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Application Tracker" })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Job applications" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Google Calendar Handoff" })).toBeVisible();
  await expect(page.getByText(/환경 설정 필요|미연결|연결됨/)).toBeVisible();
});

test("creates, edits, and deletes a sprint work item", async ({ page }) => {
  const title = `E2E 작업 ${Date.now()}`;
  const updatedTitle = `${title} 수정`;
  const sprintSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Sprint Board" }) });
  const createForm = sprintSection.locator("form.compact-form");

  await createForm.getByLabel("작업명").fill(title);
  await createForm.getByLabel("영역").selectOption("project");
  await createForm.getByLabel("우선순위").selectOption("3");
  await createForm.getByRole("button", { name: "작업 추가" }).click();

  const statusSelect = sprintSection.getByRole("combobox", { name: `${title} 상태 변경` });
  const card = statusSelect.locator("xpath=ancestor::article[contains(@class, 'task-card')]");
  await expect(card).toBeVisible();

  await card.getByLabel("작업명").fill(updatedTitle);
  await card.getByLabel("우선순위").selectOption("1");
  await card.getByRole("button", { name: "저장" }).click();

  const updatedStatusSelect = sprintSection.getByRole("combobox", {
    name: `${updatedTitle} 상태 변경`
  });
  const updatedCard = updatedStatusSelect.locator("xpath=ancestor::article[contains(@class, 'task-card')]");
  await expect(updatedCard).toBeVisible();

  await updatedCard.getByRole("button", { name: "삭제" }).click();
  await expect(updatedCard).toHaveCount(0);
});

test("creates study and project items, then verifies the assistant status board", async ({ page }) => {
  const study = `E2E Study ${Date.now()}`;
  const studySection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Study Planner" }) });

  await studySection.locator("form").getByLabel("주제").fill(study);
  await studySection.locator("form").getByRole("button", { name: "공부 추가" }).click();
  await expect(studySection.getByText(study)).toBeVisible();

  const project = `E2E Project ${Date.now()}`;
  const projectSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Portfolio Projects" }) });

  await projectSection.locator("form").getByLabel("프로젝트").fill(project);
  await projectSection.locator("form").getByLabel("목표").fill("E2E smoke flow");
  await projectSection.locator("form").getByRole("button", { name: "프로젝트 추가" }).click();
  await expect(projectSection.getByText(project)).toBeVisible();

  await expect(page.getByRole("heading", { name: "Codex CLI 상태판" })).toBeVisible();
  await expect(page.getByRole("button", { name: "새로고침" })).toBeVisible();
  await expect(page.getByLabel("Assistant tracked actions")).toBeVisible();
});
