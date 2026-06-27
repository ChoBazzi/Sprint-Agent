# Spec: Developer Job-Prep Assistant Web App

## Assumptions
1. This is a new web application built in this repository.
2. The first version is a single-user MVP: data can be entered manually and persisted through a real relational database.
3. External integrations are out of scope for the first version: no job-site crawling, email automation, Google Calendar sync, Notion sync, or automated resume submission.
4. The main user is one developer job seeker managing personal schedules, study, job applications, resumes, and projects.
5. The app should feel like a working developer operations dashboard, not a marketing site.
6. Korean UI copy is acceptable by default because the primary user is Korean-speaking.
7. This personal tool should optimize for speed of use and iteration, not enterprise backend architecture.
8. AI assistance should be powered by Codex through a local server-side adapter, not by exposing Codex credentials or process control in the browser.
9. Codex should act as a planning and review assistant for job-prep work; it should not autonomously apply to companies, send messages, or modify user data without confirmation.
10. Spring Boot, authentication, and authorization should be handled in a separate portfolio backend project; this tool can still use PostgreSQL for data stability and future expansion.

## Objective
Build a web-based personal operating assistant for a developer job seeker.

The app helps the user run their job-prep life like a developer team workflow:

- Manage personal and study schedules through sprint planning.
- Track job applications, resume versions, deadlines, and next actions.
- Manage portfolio projects with tasks, milestones, and status.
- Produce a daily operating view that recommends what to focus on today.
- Adjust priorities when deadlines, sprint scope, or progress changes.
- Use Codex as an AI assistant for sprint planning, daily prioritization, study plan review, resume/application preparation, and project next-action suggestions.

## MVP User Stories
- As a user, I can see today's recommended tasks across study, applications, projects, and personal commitments.
- As a user, I can create a sprint with a date range, goals, backlog items, and daily tasks.
- As a user, I can move work items through statuses such as backlog, planned, in progress, blocked, done, and skipped.
- As a user, I can register job applications with company, role, deadline, status, resume version, links, notes, and next action.
- As a user, I can manage study plans by topic, target date, estimated effort, progress, and review cycle.
- As a user, I can manage projects by goal, stack, milestones, task list, portfolio-readiness, and next action.
- As a user, I can review a weekly summary of completed work, missed work, blockers, and next sprint suggestions.
- As a user, I can ask the Codex assistant to generate a daily plan from my current schedule, sprint, applications, study items, and projects.
- As a user, I can ask the Codex assistant to review my active sprint and suggest a realistic scope adjustment.
- As a user, I can ask the Codex assistant to suggest next actions for a job application, resume version, or portfolio project.

## MVP Scope
- First screen: Daily Command Center.
- First managed workflow: sprint and task management.
- First Codex feature: daily plan generation.
- First navigation model: dashboard plus board/list views; calendar view is deferred.
- UI language: Korean-first, with familiar developer workflow terms kept in English where clearer, such as Sprint, Backlog, In Progress, Blocked, and Review.
- Resume management: metadata-only for MVP; file upload is deferred.

## Tech Stack
- Frontend: React + TypeScript + Vite
- Local backend: Node.js + TypeScript
- Database: PostgreSQL, initially run locally through Docker Compose
- Database access: Prisma
- Migrations: Prisma migrations
- AI adapter: Node.js Codex SDK behind local `/api/assistant/*` endpoints
- Styling: CSS Modules or plain CSS with design tokens
- State: React state plus API-backed server state
- Persistence for MVP: PostgreSQL through the Node backend, not browser-only state
- AI integration: Node backend exposes stable `/api/assistant/*` endpoints and calls Codex server-side
- Tests: Vitest for unit tests, Playwright for browser-level checks when UI exists
- Package manager: npm unless the project later standardizes on another tool

## Commands
These commands apply after the app scaffold is created.

```bash
npm install
npm run dev
npm run build
npm run test
npm run lint
npm run db:up
npm run db:migrate
npm run db:studio
```

If Playwright is added:

```bash
npm run test:e2e
```

## Project Structure
```text
docs/
  specs/
    developer-assistant-webapp.md
prisma/
  schema.prisma
  migrations/
src/
  app/
    App.tsx
    routes.ts
  server/
    api/
    assistant/
      codex-assistant.ts
      prompt-builders.ts
      schemas.ts
    storage/
      repository.ts
      prisma.ts
      repositories/
  components/
    assistant/
    dashboard/
    sprint/
    applications/
    study/
    projects/
  domain/
    sprint.ts
    applications.ts
    study.ts
    projects.ts
    recommendations.ts
    assistant.ts
  storage/
    api-client.ts
  styles/
    tokens.css
    global.css
  test/
    fixtures.ts
tests/
  unit/
e2e/
docker-compose.yml
```

## Product Areas

### Daily Command Center
- Shows today's date, active sprint, critical deadlines, blocked work, and recommended focus.
- Combines items from study, job applications, projects, and personal schedule.
- Sorts recommendations by urgency, importance, and estimated effort.
- Provides an explicit "Ask Codex" action that sends a summarized snapshot of current planning data to the backend assistant.

### Sprint Management
- Supports sprint creation with start date, end date, sprint goal, capacity, and backlog.
- Supports developer-style statuses: backlog, planned, in progress, blocked, done, skipped.
- Supports sprint review fields: completed, missed, blockers, lessons, next sprint candidate work.

### Study Schedule
- Tracks topics, resources, target dates, estimated effort, status, and review dates.
- Supports recurring review suggestions for interview prep or weak topics.
- Connects study tasks to sprint goals.

### Job Application Management
- Tracks company, role, posting URL, deadline, application status, resume version, cover letter state, interview state, and next action.
- Highlights deadlines and stale applications with no next action.
- Supports statuses such as interested, preparing, applied, coding test, interview, offer, rejected, archived.

### Resume Management
- Tracks resume versions and which companies used each version.
- Stores notes about what changed and what role type the version targets.
- MVP stores metadata only; file upload can be added later.

### Project Management
- Tracks portfolio projects with goal, stack, milestones, task status, blockers, and portfolio-readiness.
- Surfaces next actions that improve employability, such as README, demo, deployment, tests, or case study.

### Codex AI Assistant
- Runs only after the user triggers an action such as daily planning, sprint review, application next-action review, resume review, or project review.
- Receives a structured snapshot from the local backend instead of raw browser state.
- Returns structured suggestions that the user can accept, edit, or ignore.
- Must not directly mutate schedules, sprint items, applications, resumes, or projects.
- Must not receive secrets, private credentials, or unnecessary personal data.
- Should explain why each recommendation matters for developer job preparation.
- Is kept behind the Node assistant service so the frontend does not talk to Codex directly.

## Recommendation Rules
The MVP should combine deterministic rules with optional Codex assistance.

Deterministic rules run locally and provide instant prioritization:

- Deadline within 3 days increases priority.
- Blocked items are surfaced but not recommended as focus unless the next action is unblocking.
- Tasks tied to the active sprint are preferred over unscheduled backlog items.
- Job applications with missing next action are flagged.
- Study items past target date are flagged.
- Portfolio projects missing demo, README, or deployment get suggested next actions.

Codex assistance runs server-side and provides higher-level planning:

- Summarize today's workload and propose a realistic focus plan.
- Explain tradeoffs when too many tasks are planned.
- Suggest sprint scope cuts when capacity is exceeded.
- Suggest concrete next actions for stale job applications.
- Suggest portfolio project improvements that strengthen employability.
- Draft resume improvement notes based on user-provided resume metadata and target role notes.

## AI API Contract
The frontend should call application-owned endpoints rather than Codex directly.

```text
POST /api/assistant/daily-plan
POST /api/assistant/sprint-review
POST /api/assistant/application-review
POST /api/assistant/project-review
```

All assistant endpoints follow this shape:

```ts
export interface AssistantSuggestion {
  id: string;
  title: string;
  rationale: string;
  suggestedActions: string[];
  affectedItemIds: string[];
  confidence: "low" | "medium" | "high";
}

export interface AssistantResponse {
  summary: string;
  suggestions: AssistantSuggestion[];
  warnings: string[];
}
```

The backend owns request construction. The frontend sends only action-specific user intent, such as:

```ts
export interface DailyPlanRequest {
  date: string;
  userInstruction?: string;
}
```

The backend loads PostgreSQL-backed planning data, builds the assistant context, calls Codex, validates the response, and returns `AssistantResponse`.

Error responses should use a consistent shape:

```ts
export interface ApiErrorResponse {
  error: {
    code: "VALIDATION_ERROR" | "AI_UNAVAILABLE" | "AI_TIMEOUT" | "SERVER_ERROR";
    message: string;
    details?: unknown;
  };
}
```

## Code Style
Prefer small typed domain functions over logic embedded directly inside components.

```ts
export type WorkItemStatus =
  | "backlog"
  | "planned"
  | "in_progress"
  | "blocked"
  | "done"
  | "skipped";

export function isActionableToday(item: WorkItem, today: Date): boolean {
  if (item.status === "done" || item.status === "skipped") {
    return false;
  }

  return item.dueDate <= today || item.status === "in_progress";
}
```

Conventions:
- Use TypeScript types for domain data.
- Keep recommendation logic in `src/domain/recommendations.ts`.
- Keep assistant request/response types in `src/domain/assistant.ts`.
- Keep persistence behind `src/server/storage/repository.ts`.
- Keep database schema changes in Prisma migrations.
- Keep Codex-specific code behind `src/server/assistant/codex-assistant.ts`.
- Keep API route handlers thin: validate input, call domain/application functions, return DTOs.
- Use Korean UI labels where they help the primary user move faster.
- Do not put business logic inside CSS or JSX conditionals when a named function would clarify intent.

## Testing Strategy
- Unit-test domain rules for recommendations, sprint status transitions, deadline priority, and application stale-state detection.
- Unit-test repository behavior with fixed sample data.
- Integration-test Prisma queries that depend on PostgreSQL behavior where practical.
- Unit-test assistant prompt builders so they include required context and exclude secrets.
- Unit-test assistant response parsing and validation.
- Component-test or browser-test the main dashboard once UI exists.
- Build must pass before treating the MVP as complete.
- Add regression tests whenever a scheduling or recommendation bug is fixed.

Minimum MVP verification:

```bash
npm run build
npm run test
npm run db:migrate
```

## Boundaries
- Always: keep MVP scope focused on manual input, clear dashboards, deterministic recommendations, optional Codex assistance, and PostgreSQL persistence.
- Always: make domain rules testable outside React components.
- Always: keep Codex integration server-side and behind Node-owned assistant endpoints.
- Always: require a user action before sending planning data to Codex.
- Always: validate assistant request and response payloads at API boundaries.
- Always: protect user data from accidental loss with explicit delete confirmations once deletion exists.
- Ask first: adding authentication, multi-user support, external non-Codex API integrations, file upload, paid services beyond the user's approved Codex/OpenAI usage, hosted database services, or MCP.
- Ask first: changing the product language from Korean-first to English-first.
- Never: turn this personal tool into the Spring portfolio backend project.
- Never: store secrets in source code.
- Never: expose Codex credentials, OpenAI API keys, or local Codex auth files to the browser.
- Never: scrape job sites or automate applications without explicit approval.
- Never: send emails, submit forms, or contact companies automatically in the MVP.
- Never: let Codex mutate user-entered planning data without an explicit accept/apply step.

## Success Criteria
- The user can open the app and understand today's top priorities within 10 seconds.
- The user can create an active sprint and see sprint work grouped by status.
- The user can add at least one job application and see its next action and deadline surfaced.
- The user can add at least one study item and one project task and have both appear in daily recommendations.
- The recommendation engine can be tested with fixed sample data.
- The user can trigger a Codex-powered daily plan request and receive structured suggestions.
- Assistant suggestions are displayed as reviewable recommendations, not automatically applied changes.
- The app handles Codex timeout or unavailable states without losing user data.
- Reloading the app does not lose entered MVP data because it is persisted in PostgreSQL.
- The app builds successfully and core domain tests pass.

## Open Questions
- None for MVP planning. New questions should be captured here only when they block implementation or change scope.
