# MVP Status: Developer Job-Prep Assistant

## Date
2026-06-29

## Implemented
- React + TypeScript + Vite frontend.
- Node.js + TypeScript Express backend.
- PostgreSQL + Prisma schema and initial migration.
- Sprint management:
  - Create active sprint.
  - Create, patch, move, and delete work items.
- Job application management:
  - Create, list, filter, and patch applications.
  - Track status, deadline, next action, resume version, notes, and posting URL metadata.
- Resume version management:
  - Create, list, and patch resume version metadata.
  - Metadata only; resume file upload is intentionally deferred.
- Study planning:
  - Create, list, and patch study items.
  - Track status, target date, progress, estimated hours, and review date.
- Portfolio project tracking:
  - Create, list, and patch projects.
  - Track status, next action, stack, and portfolio readiness flags.
- Daily Command Center:
  - Surfaces sprint work, blocked work, due applications, missing next actions, due study targets, and portfolio gaps.
- Assistant endpoints:
  - `POST /api/assistant/daily-plan`
  - `POST /api/assistant/sprint-review`
  - `POST /api/assistant/application-review`
  - `POST /api/assistant/project-review`
- Assistant behavior:
  - Default `AI_ASSISTANT_MODE=stub` uses deterministic local recommendations.
  - Optional `AI_ASSISTANT_MODE=codex` calls local `codex exec` in read-only mode.
  - Browser never receives Codex credentials.
  - Assistant suggestions do not mutate user data.
- Local database operations:
  - `npm run db:up` starts PostgreSQL.
  - `npm run db:seed` creates sample data.
  - `npm run db:backup` writes ignored custom dumps under `backups/`.
  - `npm run db:restore -- backups/<file>.dump` restores a dump.
- Browser E2E checks:
  - Seeded dashboard data renders.
  - Sprint work items can be created, edited, and deleted.
  - Job applications can be created and filtered by missing next action.
  - Study/project creation and assistant daily-plan request work end to end.
- README quick-start and command documentation.

## Verification
- `npm run test` passed: 9 files, 32 tests.
- `npm run build` passed.
- `npm run lint` passed.
- `npm run test:e2e` passed: 4 Playwright tests.
- `npm run db:up` started PostgreSQL and the container reported healthy.
- `npx prisma migrate status` reported the database schema is up to date.
- `npm run db:seed` completed successfully.
- `npm run db:backup` created an ignored local dump under `backups/`.
- Local Codex CLI smoke test passed with `codex --ask-for-approval never exec --sandbox read-only`.
- Frontend dev server starts at `http://127.0.0.1:5173/`.
- API dev server starts at `http://127.0.0.1:3001/`.

## Runtime Requirements
The API requires PostgreSQL at `127.0.0.1:5432`. Start Docker Desktop first, then run:

```bash
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

## Not Yet Implemented
- Authentication and authorization; intentionally deferred because this is a local personal tool.
- Calendar integration, job-site crawling, email automation, Notion sync, and resume file upload.
- Assistant actions that apply changes automatically; intentionally out of scope.
- Real deployment target; this is currently optimized for local personal use.

## Next Hardening Tasks
- Decide whether to keep this as local-only or add a private deployment target.
- Add restore verification against a disposable database before relying on backups for important personal data.
- Add authentication only if the app is deployed beyond the local machine.
