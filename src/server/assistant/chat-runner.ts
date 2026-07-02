import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { AssistantMessage } from "../../domain/assistant-chat.js";
import { buildDailyPlanPrompt, type DailyPlanContext } from "./prompt-builders.js";

const execFileAsync = promisify(execFile);

export type AssistantChatRunnerInput = {
  conversationId: string;
  userMessage: string;
  history: AssistantMessage[];
  context: DailyPlanContext;
};

export type AssistantChatRunnerOptions = {
  runCodex?: (input: { prompt: string; cwd: string; timeoutMs: number }) => Promise<string>;
  cwd?: string;
  timeoutMs?: number;
};

export async function runAssistantChat(
  input: AssistantChatRunnerInput,
  options: AssistantChatRunnerOptions = {}
): Promise<string> {
  if (process.env.AI_ASSISTANT_MODE !== "codex") {
    return createLocalChatResponse(input);
  }

  const prompt = buildChatPrompt(input);
  return (options.runCodex ?? runCodexCli)({
    prompt,
    cwd: options.cwd ?? process.cwd(),
    timeoutMs: options.timeoutMs ?? Number(process.env.CODEX_ASSISTANT_TIMEOUT_MS ?? 60_000)
  });
}

export function buildChatPrompt(input: AssistantChatRunnerInput): string {
  return [
    "You are a Korean personal AI schedule assistant for a developer job seeker.",
    "You can discuss plans conversationally and directly register or change calendar events through MCP tools.",
    "Do not directly claim that a calendar action was applied unless the MCP tool result says it was applied.",
    "Every direct calendar registration or change is verified by a calendar verification subagent that reads Google Calendar back through the MCP tool result.",
    "For new calendar additions, use the MCP tool create_calendar_event with this conversationId:",
    input.conversationId,
    "For calendar update requests, use update_calendar_event when the user provides or you can identify a Google event id.",
    "Use create_calendar_event_draft or delete_calendar_event_draft only when the user explicitly asks for an approval step.",
    "After a direct calendar tool call, mention the action id and whether the verification subagent passed or failed.",
    "Current workspace context:",
    buildDailyPlanPrompt(input.context),
    "Recent conversation:",
    formatHistory(input.history),
    "Latest user message:",
    input.userMessage,
    "Reply in Korean. Keep the answer concise and action-oriented."
  ].join("\n\n");
}

async function runCodexCli({
  prompt,
  cwd,
  timeoutMs
}: {
  prompt: string;
  cwd: string;
  timeoutMs: number;
}): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "job-prep-codex-chat-"));
  const outputPath = join(tempDir, "assistant-chat.txt");

  try {
    await execFileAsync(
      "codex",
      [
        "--ask-for-approval",
        "never",
        "exec",
        "--sandbox",
        "read-only",
        "--cd",
        cwd,
        "--output-last-message",
        outputPath,
        prompt
      ],
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024
      }
    );

    return (await readFile(outputPath, "utf8")).trim();
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

function createLocalChatResponse(input: AssistantChatRunnerInput): string {
  const hasCalendarIntent = /캘린더|일정|시간|블록|calendar/i.test(input.userMessage);
  if (hasCalendarIntent) {
    return [
      "지금은 stub 모드라 실제 Codex MCP 도구를 호출하지 않았습니다.",
      "원하는 시간, 제목, 날짜를 알려주면 Codex 모드에서 캘린더 초안을 만들 수 있습니다.",
      "실제 사용은 `.env`의 `AI_ASSISTANT_MODE=codex`로 전환한 뒤 진행하세요."
    ].join(" ");
  }

  return "현재 작업 데이터를 기준으로 계획을 정리할 수 있습니다. 오늘 할 공부, 프로젝트, 캘린더에 넣을 시간 블록을 자연어로 말해 주세요.";
}

function formatHistory(messages: AssistantMessage[]): string {
  if (messages.length === 0) {
    return "none";
  }

  return messages
    .slice(-12)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
}
