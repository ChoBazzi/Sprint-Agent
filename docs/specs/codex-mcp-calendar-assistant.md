# Spec: Codex MCP Calendar Assistant

## Objective
Build a conversational assistant inside the web app that can discuss study, sprint, project, and job-follow-up planning, then prepare Google Calendar add/delete actions through a local MCP server. The assistant must make proposed actions visible in the web UI and track each action status before anything is applied.

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
- MCP server smoke: `npm run mcp:calendar`
- Build: `npm run build`
- Typecheck: `npm run lint`
- Unit tests: `npm run test`
- E2E tests: `npm run test:e2e`
- Migrate DB: `npm run db:migrate`
- Seed DB: `npm run db:seed`

## Project Structure
- `src/mcp/` contains local MCP servers exposed to Codex.
- `src/server/assistant/` contains Codex prompt/run orchestration.
- `src/server/api/assistant.ts` exposes assistant chat and action approval APIs.
- `src/domain/assistant-chat.ts` defines UI/API contracts.
- `src/components/assistant/` renders the conversational assistant UI.
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
- Unit tests cover action state transitions and Codex chat prompt construction.
- Existing Google Calendar tests remain the provider-level guard.
- E2E verifies the chat panel renders and the app no longer depends on the removed application tracker.
- Manual verification can use `AI_ASSISTANT_MODE=stub` for UI and `AI_ASSISTANT_MODE=codex` for local Codex/MCP checks.

## Boundaries
- Always: store user/assistant messages and proposed actions in PostgreSQL.
- Always: require explicit user approval before applying calendar creates/deletes.
- Always: validate MCP tool input and Codex output as untrusted data.
- Ask first: adding public deployment, authentication, or background automations.
- Never: expose Google tokens or Codex auth files to the browser.
- Never: let Codex directly apply calendar actions without a tracked action record.

## Success Criteria
- User can send a chat message from the web UI.
- Backend stores the conversation and messages.
- Codex is invoked with MCP server availability when `AI_ASSISTANT_MODE=codex`.
- MCP server can create tracked calendar action drafts.
- Web UI shows pending actions and lets the user approve or reject them.
- Calendar apply status is visible as `proposed`, `approved`, `applied`, `rejected`, or `failed`.
- All tests, lint, build, and E2E pass.

## Open Questions
- Two-way Google Calendar sync remains deferred.
- True persistent Codex SDK threads are deferred; this version stores app-level conversation history and sends it into each Codex run.
