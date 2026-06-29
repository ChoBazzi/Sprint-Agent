import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { AssistantResponse } from "../../domain/assistant.js";
import { assistantResponseSchema } from "./schemas.js";
import { buildDailyPlanPrompt, type DailyPlanContext } from "./prompt-builders.js";

const execFileAsync = promisify(execFile);

export type CodexRunnerInput = {
  prompt: string;
  cwd: string;
  timeoutMs: number;
};

export type CodexRunner = (input: CodexRunnerInput) => Promise<string>;

export type CodexDailyPlanOptions = {
  runCodex?: CodexRunner;
  cwd?: string;
  timeoutMs?: number;
};

export async function createCodexDailyPlan(
  context: DailyPlanContext,
  options: CodexDailyPlanOptions = {}
): Promise<AssistantResponse> {
  const prompt = buildCodexPrompt(context);
  const responseText = await (options.runCodex ?? runCodexCli)({
    prompt,
    cwd: options.cwd ?? process.cwd(),
    timeoutMs: options.timeoutMs ?? Number(process.env.CODEX_ASSISTANT_TIMEOUT_MS ?? 60_000)
  });

  return parseAssistantResponse(responseText);
}

function buildCodexPrompt(context: DailyPlanContext): string {
  return [
    buildDailyPlanPrompt(context),
    "Return only valid JSON matching this TypeScript shape:",
    "{ summary: string; suggestions: Array<{ id: string; title: string; rationale: string; suggestedActions: string[]; affectedItemIds: string[]; confidence: 'low' | 'medium' | 'high' }>; warnings: string[] }",
    "Do not include Markdown, code fences, shell commands, or file edits."
  ].join("\n\n");
}

async function runCodexCli({ prompt, cwd, timeoutMs }: CodexRunnerInput): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "job-prep-codex-"));
  const outputPath = join(tempDir, "daily-plan.json");

  try {
    await execFileAsync(
      "codex",
      buildCodexCliArgs({ cwd, outputPath, prompt }),
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024
      }
    );

    return await readFile(outputPath, "utf8");
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

export function buildCodexCliArgs({
  cwd,
  outputPath,
  prompt
}: {
  cwd: string;
  outputPath: string;
  prompt: string;
}): string[] {
  return [
    "--ask-for-approval",
    "never",
    "exec",
    "--sandbox",
    "read-only",
    "--ephemeral",
    "--cd",
    cwd,
    "--output-last-message",
    outputPath,
    prompt
  ];
}

function parseAssistantResponse(value: string): AssistantResponse {
  const jsonText = stripJsonFence(value.trim());
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Codex response was not valid JSON.");
  }

  const result = assistantResponseSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error("Codex response did not match the assistant schema.");
  }

  return result.data;
}

function stripJsonFence(value: string): string {
  const fenceMatch = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : value;
}
