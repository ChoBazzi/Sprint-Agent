# Developer Job-Prep Assistant

개발자 취업 준비를 Sprint 방식으로 운영하기 위한 개인용 웹앱입니다. 개인 일정, 공부 항목, 회사 지원 현황, 이력서 버전, 포트폴리오 프로젝트를 PostgreSQL에 저장하고, 로컬 Codex CLI를 통해 계획/리뷰 제안을 받을 수 있습니다.

## Quick Start

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

앱은 `http://127.0.0.1:5173/`에서 열립니다. API 서버는 `http://127.0.0.1:3001/`에서 실행됩니다.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Vite frontend와 Express API를 함께 실행 |
| `npm run build` | 서버 TypeScript와 프론트엔드 프로덕션 빌드 |
| `npm run test` | Vitest 단위/통합 테스트 실행 |
| `npm run test:e2e` | seed 데이터를 넣고 Playwright 브라우저 테스트 실행 |
| `npm run lint` | frontend/server TypeScript 타입 검사 |
| `npm run db:up` | Docker Compose PostgreSQL 시작 |
| `npm run db:migrate` | Prisma migration 적용 |
| `npm run db:seed` | 샘플 Sprint, 지원건, 공부, 프로젝트 데이터 생성 |
| `npm run db:backup` | `backups/`에 PostgreSQL custom dump 생성 |
| `npm run db:restore -- backups/<file>.dump` | dump 파일에서 PostgreSQL 복구 |
| `npm run db:studio` | Prisma Studio 실행 |

## Architecture

- Frontend: React, TypeScript, Vite
- Backend: Node.js, TypeScript, Express
- Database: PostgreSQL 17 through Docker Compose
- ORM/migrations: Prisma
- Tests: Vitest and Playwright
- AI assistant: server-side adapter around local `codex exec`

The browser calls application-owned endpoints only. Codex credentials and local auth state stay outside the repository and are never sent to the frontend.

## Product Scope

Implemented MVP workflows:

- Daily Command Center for today's focus and planning alerts.
- Sprint board with create, edit, move, and delete for work items.
- Application tracker with deadlines, statuses, next actions, and resume versions.
- Study planner with progress, target dates, review dates, and statuses.
- Portfolio project tracker with next actions and readiness flags.
- Assistant endpoints for daily plan, sprint review, application review, and project review.

Deferred by design:

- Authentication and authorization.
- Calendar/job-site/email/Notion integrations.
- Resume file upload.
- Automatic assistant actions that mutate user data.
- Public hosted service deployment.

## Codex Mode

Default mode is deterministic and local:

```env
AI_ASSISTANT_MODE=stub
```

To use the existing local Codex login/subscription, set:

```env
AI_ASSISTANT_MODE=codex
CODEX_ASSISTANT_TIMEOUT_MS=60000
```

The backend calls `codex exec` in read-only mode and expects structured JSON. If Codex fails, the API falls back to the local deterministic assistant and includes a warning.

## Data Boundary

This repository is safe to publish only when it contains code and sample data. Do not commit `.env`, database dumps, real resumes, personal job notes, tokens, Codex auth files, or local backups. See [docs/security/git-data-boundary.md](docs/security/git-data-boundary.md) for the pre-push checklist.

## Docs

- [MVP spec](docs/specs/developer-assistant-webapp.md)
- [Implementation plan](docs/plans/developer-assistant-mvp-plan.md)
- [Current status](docs/status/mvp-status-2026-06-29.md)
- [Git and data boundary](docs/security/git-data-boundary.md)
