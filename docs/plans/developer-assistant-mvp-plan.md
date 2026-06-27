# Implementation Plan: Developer Job-Prep Assistant MVP

## Overview
Build the first usable version of the personal job-prep assistant: a React dashboard backed by a Node/TypeScript API, PostgreSQL, Prisma, and a server-side Codex assistant. The first complete workflow is Daily Command Center plus sprint/task management plus Codex daily plan generation.

## Architecture Decisions
- Use React + TypeScript + Vite for the UI.
- Use Node.js + TypeScript for the local backend.
- Use PostgreSQL through Docker Compose for durable local data.
- Use Prisma for schema, migrations, and type-safe database access.
- Keep Codex behind backend endpoints; the browser never receives Codex credentials or process control.
- Start with dashboard plus board/list views. Defer calendar view, file upload, authentication, and external integrations.

## Dependency Graph
```text
Project scaffold
  -> Docker Compose Postgres
    -> Prisma schema and migrations
      -> Repository layer
        -> Domain recommendation rules
          -> API endpoints
            -> Frontend API client
              -> Daily Command Center UI
              -> Sprint/task board UI
                -> Codex daily plan endpoint
                  -> Assistant panel UI
```

## Task List

### Phase 1: Foundation

#### Task 1: Scaffold React and Node TypeScript App
**Description:** Create the project skeleton, package scripts, TypeScript config, Vite app entry, and Node backend entrypoint.

**Acceptance criteria:**
- [ ] `npm run dev` starts frontend and backend development processes.
- [ ] `npm run build` compiles frontend and backend code.
- [ ] `npm run test` runs the test runner, even if only smoke tests exist.

**Verification:**
- [ ] Run `npm install`
- [ ] Run `npm run build`
- [ ] Run `npm run test`

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `src/app/App.tsx`
- `src/server/index.ts`

**Estimated scope:** Medium

#### Task 2: Add PostgreSQL and Prisma Foundation
**Description:** Add Docker Compose for PostgreSQL, Prisma schema, environment loading, migration scripts, and Prisma client setup.

**Acceptance criteria:**
- [ ] `npm run db:up` starts local PostgreSQL.
- [ ] `npm run db:migrate` applies the initial Prisma migration.
- [ ] Backend can create and close a Prisma client connection.

**Verification:**
- [ ] Run `npm run db:up`
- [ ] Run `npm run db:migrate`
- [ ] Run `npm run test`

**Dependencies:** Task 1

**Files likely touched:**
- `docker-compose.yml`
- `prisma/schema.prisma`
- `src/server/storage/prisma.ts`
- `.env.example`
- `package.json`

**Estimated scope:** Medium

### Checkpoint: Foundation
- [ ] Frontend and backend compile.
- [ ] PostgreSQL starts locally.
- [ ] Prisma migration succeeds.
- [ ] Test runner works.

### Phase 2: Core Sprint and Task Workflow

#### Task 3: Define Core Domain and Database Models
**Description:** Define MVP models for sprint, work item, job application, study item, project, and resume version. Keep resume files out of scope.

**Acceptance criteria:**
- [ ] Prisma schema includes MVP entities and relations.
- [ ] Domain TypeScript types mirror API-facing DTOs.
- [ ] Seed or fixture data can represent one active sprint with tasks.

**Verification:**
- [ ] Run `npm run db:migrate`
- [ ] Run `npm run test`

**Dependencies:** Task 2

**Files likely touched:**
- `prisma/schema.prisma`
- `src/domain/sprint.ts`
- `src/domain/applications.ts`
- `src/domain/study.ts`
- `src/domain/projects.ts`
- `src/test/fixtures.ts`

**Estimated scope:** Medium

#### Task 4: Implement Sprint and Work Item Repository
**Description:** Add repository functions for active sprint lookup, sprint creation, work item listing, work item creation, and status updates.

**Acceptance criteria:**
- [ ] Repository can create an active sprint.
- [ ] Repository can create and list work items by status.
- [ ] Repository can update work item status.

**Verification:**
- [ ] Run repository tests with fixed sample data.
- [ ] Run `npm run test`

**Dependencies:** Task 3

**Files likely touched:**
- `src/server/storage/repository.ts`
- `src/server/storage/repositories/sprints.ts`
- `tests/unit/sprint-repository.test.ts`

**Estimated scope:** Medium

#### Task 5: Add Sprint and Work Item API Endpoints
**Description:** Expose thin backend endpoints for active sprint, sprint creation, work item creation, and work item status updates.

**Acceptance criteria:**
- [ ] API returns the active sprint and grouped work items.
- [ ] API validates create/update inputs.
- [ ] API returns consistent validation errors.

**Verification:**
- [ ] Run endpoint tests or request-level smoke tests.
- [ ] Run `npm run test`

**Dependencies:** Task 4

**Files likely touched:**
- `src/server/api/sprints.ts`
- `src/server/api/work-items.ts`
- `src/server/assistant/schemas.ts`
- `tests/unit/sprint-api.test.ts`

**Estimated scope:** Medium

### Checkpoint: Core Data Flow
- [ ] A sprint and tasks can be persisted.
- [ ] Task statuses can be changed.
- [ ] API validation and error shapes are consistent.

### Phase 3: Daily Command Center UI

#### Task 6: Build API Client and App Shell
**Description:** Add frontend API client, app layout, navigation shell, and initial Korean-first UI tokens.

**Acceptance criteria:**
- [ ] Frontend can call the backend without hardcoded mock data.
- [ ] App shell has Daily Command Center and Sprint sections.
- [ ] UI uses Korean labels with selected English workflow terms.

**Verification:**
- [ ] Run `npm run build`
- [ ] Manual check: app loads without console errors.

**Dependencies:** Task 5

**Files likely touched:**
- `src/storage/api-client.ts`
- `src/app/App.tsx`
- `src/styles/tokens.css`
- `src/styles/global.css`

**Estimated scope:** Medium

#### Task 7: Build Sprint Board UI
**Description:** Show sprint work items grouped by Backlog, Planned, In Progress, Blocked, Done, and Skipped, with basic creation and status movement.

**Acceptance criteria:**
- [ ] User can create a work item.
- [ ] User can move a work item between statuses.
- [ ] UI remains stable across empty, loading, and error states.

**Verification:**
- [ ] Run `npm run build`
- [ ] Manual check: create and move a task.

**Dependencies:** Task 6

**Files likely touched:**
- `src/components/sprint/SprintBoard.tsx`
- `src/components/sprint/WorkItemForm.tsx`
- `src/domain/sprint.ts`
- `src/styles/global.css`

**Estimated scope:** Medium

#### Task 8: Build Daily Command Center
**Description:** Show today's focus, active sprint summary, blocked work, urgent deadlines, and deterministic recommendations from current data.

**Acceptance criteria:**
- [ ] Dashboard shows active sprint summary.
- [ ] Dashboard surfaces blocked and due-soon work.
- [ ] Recommendation rules are tested with fixed data.

**Verification:**
- [ ] Run `npm run test`
- [ ] Run `npm run build`
- [ ] Manual check: dashboard reflects seeded or entered tasks.

**Dependencies:** Task 7

**Files likely touched:**
- `src/components/dashboard/DailyCommandCenter.tsx`
- `src/domain/recommendations.ts`
- `tests/unit/recommendations.test.ts`

**Estimated scope:** Medium

### Checkpoint: Usable Personal Tool
- [ ] User can open the app and see today's top priorities.
- [ ] User can create sprint work and move it through statuses.
- [ ] PostgreSQL persistence survives reloads.

### Phase 4: Codex Daily Plan

#### Task 9: Implement Assistant Contract and Prompt Builder
**Description:** Define assistant request/response types, validation schemas, and a prompt builder for daily plan generation.

**Acceptance criteria:**
- [ ] Prompt builder includes sprint, work item, application, study, project, and resume metadata when available.
- [ ] Prompt builder excludes secrets and unnecessary personal data.
- [ ] Assistant response schema validates structured suggestions.

**Verification:**
- [ ] Run prompt builder tests.
- [ ] Run response schema tests.
- [ ] Run `npm run test`

**Dependencies:** Task 8

**Files likely touched:**
- `src/domain/assistant.ts`
- `src/server/assistant/prompt-builders.ts`
- `src/server/assistant/schemas.ts`
- `tests/unit/assistant.test.ts`

**Estimated scope:** Medium

#### Task 10: Add Codex Daily Plan Endpoint
**Description:** Add `/api/assistant/daily-plan`, call Codex server-side, validate the response, and handle unavailable/timeout states.

**Acceptance criteria:**
- [ ] Endpoint accepts date and optional user instruction.
- [ ] Endpoint returns structured assistant suggestions.
- [ ] Endpoint returns `AI_UNAVAILABLE` or `AI_TIMEOUT` without losing data.
- [ ] Endpoint can run in stub mode for local development without Codex credentials.

**Verification:**
- [ ] Run `npm run test`
- [ ] Manual check: daily plan request returns either real or stubbed suggestions.

**Dependencies:** Task 9

**Files likely touched:**
- `src/server/api/assistant.ts`
- `src/server/assistant/codex-assistant.ts`
- `src/server/index.ts`
- `.env.example`

**Estimated scope:** Medium

#### Task 11: Add Assistant Panel UI
**Description:** Add an "Ask Codex" action on the Daily Command Center and display structured suggestions as reviewable cards.

**Acceptance criteria:**
- [ ] User can request a daily plan from the dashboard.
- [ ] Suggestions show title, rationale, actions, confidence, and warnings.
- [ ] Suggestions are not auto-applied to user data.

**Verification:**
- [ ] Run `npm run build`
- [ ] Manual check: request and review suggestions.

**Dependencies:** Task 10

**Files likely touched:**
- `src/components/assistant/AssistantPanel.tsx`
- `src/components/dashboard/DailyCommandCenter.tsx`
- `src/domain/assistant.ts`

**Estimated scope:** Medium

### Checkpoint: MVP Complete
- [ ] Daily Command Center works.
- [ ] Sprint/task workflow works.
- [ ] Codex daily plan generation works or gracefully falls back.
- [ ] `npm run build`, `npm run test`, and `npm run db:migrate` pass.

## Deferred Scope
- Calendar view
- Resume file upload
- Authentication and authorization
- Multi-user support
- Job-site crawling
- Email or form automation
- Google Calendar or Notion sync
- MCP
- Spring Boot backend

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---:|---|
| Codex SDK setup blocks local development | Medium | Add stub mode before real Codex calls. |
| Prisma/PostgreSQL setup slows first run | Medium | Provide `db:up`, `db:migrate`, and `.env.example` early. |
| Dashboard scope expands into every feature | High | Keep MVP dashboard focused on sprint/tasks and daily plan. |
| AI suggestions mutate data too early | High | Suggestions remain review-only in MVP. |
| UI becomes a generic landing page | Medium | First screen is the actual operating dashboard. |

## Approval Gate
Implementation should begin after this plan is approved or corrected.
