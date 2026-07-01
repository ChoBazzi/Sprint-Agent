# 개발자 취업 준비 개인 비서

개발자 취업 준비를 Sprint 방식으로 운영하기 위한 개인용 웹앱입니다. 개인 일정, 공부 항목, 회사 지원 현황, 이력서 버전, 포트폴리오 프로젝트를 PostgreSQL에 저장하고, 로컬 Codex CLI와 MCP 서버를 통해 개인 일정 비서 상태를 추적합니다.

## 빠른 시작

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

앱은 `http://127.0.0.1:5173/`에서 열립니다. API 서버는 `http://127.0.0.1:3001/`에서 실행됩니다.

## 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | Vite 프론트엔드와 Express API를 함께 실행 |
| `npm run build` | 서버 TypeScript와 프론트엔드 프로덕션 빌드 실행 |
| `npm run test` | Vitest 단위/통합 테스트 실행 |
| `npm run test:e2e` | seed 데이터를 넣은 뒤 Playwright 브라우저 테스트 실행 |
| `npm run lint` | 프론트엔드/서버 TypeScript 타입 검사 |
| `npm run db:up` | Docker Compose PostgreSQL 시작 |
| `npm run db:migrate` | Prisma 마이그레이션 적용 |
| `npm run db:seed` | 샘플 Sprint, 지원건, 공부, 프로젝트 데이터 생성 |
| `npm run db:backup` | `backups/`에 PostgreSQL custom dump 생성 |
| `npm run db:restore -- backups/<file>.dump` | dump 파일에서 PostgreSQL 복구 |
| `npm run db:studio` | Prisma Studio 실행 |
| `npm run mcp:assistant` | Codex가 사용하는 로컬 Personal Assistant MCP 서버 실행 |
| `npm run mcp:calendar` | 기존 Calendar MCP 실행 별칭 |

## 구조

- 프론트엔드: React, TypeScript, Vite
- 백엔드: Node.js, TypeScript, Express
- 데이터베이스: Docker Compose로 실행하는 PostgreSQL 17
- ORM/마이그레이션: Prisma
- 테스트: Vitest, Playwright
- AI 비서: 로컬 Codex CLI를 기본 대화 인터페이스로 사용
- MCP 도구: `.codex/config.toml`에 등록된 프로젝트 전용 Personal Assistant MCP 서버
- 캘린더: 서버 측 OAuth를 통한 선택적 Google Calendar 연동

브라우저는 이 애플리케이션이 소유한 API 엔드포인트만 호출합니다. Codex 인증 정보와 로컬 로그인 상태는 저장소 밖에 두며, 프론트엔드로 전달하지 않습니다.

## 제품 범위

구현된 MVP 흐름:

- 오늘 집중할 일과 계획 알림을 보여주는 Daily Command Center.
- Sprint 작업, 공부 항목, 프로젝트를 함께 생성하고 드래그로 이동할 수 있는 통합 Kanban Board.
- Kanban 카드는 핵심 정보만 표시하고, 자세한 수정은 상세 패널에서 처리.
- 메인 화면에서 회사 지원 후속 행동 신호 표시. 상세 지원/이력서 관리는 메인 UX에서 제외.
- 진행률, 목표일, 복습일, 상태를 관리하는 공부 계획 기능.
- 다음 액션과 포트폴리오 준비 상태를 추적하는 프로젝트 관리 기능.
- MCP 대화 이벤트와 캘린더 작업 초안을 보여주는 Codex CLI 상태판.
- Kanban Board와 분리되어 상단에서 마감일, 공부 목표, MCP 캘린더 초안을 보여주는 월간 달력.
- 확정한 집중 시간을 Google Calendar로 넘기는 handoff 기능.

의도적으로 미룬 범위:

- 인증과 인가.
- Calendar 읽기 동기화, 채용 사이트, 이메일, Notion 연동.
- 이력서 파일 업로드.
- 사용자 데이터를 자동으로 변경하는 비서 액션.
- 공개 서비스 배포.

## Codex 모드

기본 모드는 Codex를 호출하지 않는 로컬 결정형 모드입니다.

```env
AI_ASSISTANT_MODE=stub
```

기존 로컬 Codex 로그인/이용권을 사용하려면 다음 값을 설정합니다.

```env
AI_ASSISTANT_MODE=codex
CODEX_ASSISTANT_TIMEOUT_MS=60000
```

Codex CLI가 기본 대화 인터페이스입니다. 웹앱은 상태 확인과 승인 대시보드 역할을 합니다. MCP가 기록한 대화 이벤트를 읽고, 추적 중인 캘린더 작업을 승인, 거절, 반영할 수 있습니다.

Codex는 프로젝트 전용 `personal_assistant` MCP 서버를 사용합니다. 이 서버는 워크스페이스 스냅샷, 읽기 전용 최근 로그, 자동 작업 로그 추가, 캘린더 초안 도구를 제공합니다. 로그는 추적을 위해 자동으로 추가할 수 있지만, 캘린더 초안 생성은 `오늘 18:00 test 일정 내용으로 추가하겠습니다.` 같은 최종 확인 문장을 요구합니다. 캘린더 쓰기는 먼저 비서 작업 상태로 추적됩니다.

```text
proposed -> approved -> applied
proposed -> rejected
approved -> failed
```

웹 상태판에서 작업을 승인해야 실제 반영할 수 있습니다. 기존 백엔드 리뷰 엔드포인트는 여전히 `AI_ASSISTANT_MODE=stub` 또는 `AI_ASSISTANT_MODE=codex`를 지원하지만, 메인 비서 흐름은 CLI 기반입니다.

## Google Calendar

Google Calendar 연동은 선택 사항입니다. 앱이 계획 데이터의 기준이며, Google Calendar는 확정된 시간 블록을 휴대폰 캘린더에서 볼 수 있게 하는 외부 반영 계층입니다.

Google OAuth 클라이언트를 만든 뒤 `.env`에 다음 값을 설정합니다.

```env
APP_ORIGIN="http://127.0.0.1:5173"
GOOGLE_CALENDAR_CLIENT_ID=""
GOOGLE_CALENDAR_CLIENT_SECRET=""
GOOGLE_CALENDAR_REDIRECT_URI="http://127.0.0.1:3001/api/calendar/google/callback"
GOOGLE_CALENDAR_ID="primary"
GOOGLE_CALENDAR_TOKEN_PATH="private/google-calendar-token.json"
GOOGLE_CALENDAR_STATE_PATH="private/google-calendar-state.json"
```

OAuth 토큰 파일은 Git이 무시하는 `private/` 아래에 저장합니다.

## 데이터 경계

이 저장소는 코드와 샘플 데이터만 포함할 때만 공개해도 안전합니다. `.env`, 데이터베이스 dump, 실제 이력서, 개인 지원 메모, 토큰, Codex 인증 파일, 로컬 백업은 커밋하지 마세요. push 전 확인 목록은 [docs/security/git-data-boundary.md](docs/security/git-data-boundary.md)를 참고하세요.

## 문서

- [MVP 명세](docs/specs/developer-assistant-webapp.md)
- [Codex MCP 캘린더 비서 명세](docs/specs/codex-mcp-calendar-assistant.md)
- [구현 계획](docs/plans/developer-assistant-mvp-plan.md)
- [현재 상태](docs/status/mvp-status-2026-06-29.md)
- [Git 및 데이터 경계](docs/security/git-data-boundary.md)
