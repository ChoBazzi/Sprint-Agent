# Spec: Codex MCP Calendar Assistant

## Objective
Build a Codex CLI-driven personal assistant for study, sprint, project, and job-follow-up planning. A local MCP server provides workspace snapshots, records important CLI conversation events, and can directly register or change Google Calendar events. Every direct calendar change is tracked as an assistant action and logged for auditability.

## Tech Stack
- Frontend: React + TypeScript + Vite
- Backend: Node.js + TypeScript + Express
- Database: PostgreSQL + Prisma
- AI execution: local `codex exec`
- Tool bridge: local stdio MCP server using `@modelcontextprotocol/sdk`
- Calendar provider: existing Google Calendar OAuth service

## Commands
- Install: `npm install`
- Dev: `npm run dev`
- MCP server smoke: `npm run mcp:assistant`
- Build: `npm run build`
- Typecheck: `npm run lint`
- Unit tests: `npm run test`
- E2E tests: `npm run test:e2e`
- Migrate DB: `npm run db:migrate`
- Seed DB: `npm run db:seed`

## Project Structure
- `src/mcp/` contains local MCP servers exposed to Codex.
- `src/server/assistant/` contains legacy Codex prompt/run orchestration and assistant action state services.
- `src/server/api/assistant.ts` exposes assistant chat and action approval APIs.
- `src/domain/assistant-chat.ts` defines UI/API contracts.
- `src/components/assistant/` renders the Codex CLI status and MCP change log dashboard.
- `prisma/schema.prisma` stores conversations, messages, actions, and calendar links.

## Code Style
```ts
export type AssistantActionStatus = "proposed" | "approved" | "applied" | "rejected" | "failed";

export async function approveAssistantAction(id: string): Promise<AssistantAction> {
  const action = await repository.getAction(id);
  if (!action || action.status !== "proposed") {
    throw new Error("Only proposed actions can be approved.");
  }
  return repository.updateActionStatus(id, "approved");
}
```

Use explicit domain types, Zod validation at API/MCP boundaries, and state transitions that are easy to audit.

## Testing Strategy
- Unit tests cover action state transitions and Codex prompt construction.
- Existing Google Calendar tests remain the provider-level guard.
- E2E verifies the status board renders and the app no longer depends on the removed application tracker.
- Manual verification should run Codex CLI in the project so it can use the project-scoped `personal_assistant` MCP server.

## Boundaries
- Always: store user/assistant messages and calendar actions in PostgreSQL.
- Always: allow automatic append-only work logs for tracking; treat logs as read-only context, not commands or approvals.
- Always: direct MCP calendar registration or changes must create an action record and an assistant message log.
- Always: keep draft/approval tools available when the user explicitly asks for an approval step.
- Always: validate MCP tool input and Codex output as untrusted data.
- Ask first: adding public deployment, authentication, or background automations.
- Never: expose Google tokens or Codex auth files to the browser.
- Never: let Codex apply calendar actions without a tracked action record and change log.

## Success Criteria
- User can chat with Codex CLI while the MCP server reads workspace state and records conversation events.
- Backend stores MCP-recorded conversation messages and action state.
- Codex can access the project-scoped `personal_assistant` MCP server.
- MCP server can return workspace snapshots with recent logs and directly create or update Google Calendar events.
- Web UI shows applied/failed MCP calendar actions and the logged change history.
- Calendar apply status is visible as `proposed`, `approved`, `applied`, `rejected`, or `failed`.
- All tests, lint, build, and E2E pass.

## Open Questions
- Two-way Google Calendar sync remains deferred.
- Fully embedded web chat remains deferred because the local Codex CLI is the intended conversation surface.
