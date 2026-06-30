import { describe, expect, it } from "vitest";
import { buildChatPrompt } from "../src/server/assistant/chat-runner";

describe("buildChatPrompt", () => {
  it("instructs Codex to use tracked MCP calendar drafts", () => {
    const prompt = buildChatPrompt({
      conversationId: "conversation-1",
      userMessage: "내일 오전 네트워크 공부 2시간 캘린더에 잡아줘",
      history: [
        {
          id: "message-1",
          conversationId: "conversation-1",
          role: "user",
          content: "오늘 계획을 정리해줘",
          createdAt: "2026-07-01T00:00:00.000Z"
        }
      ],
      context: {
        date: "2026-07-01",
        userInstruction: "내일 오전 네트워크 공부 2시간 캘린더에 잡아줘",
        sprint: null,
        applications: [],
        resumeVersions: [],
        studyItems: [],
        projects: []
      }
    });

    expect(prompt).toContain("conversation-1");
    expect(prompt).toContain("create_calendar_event_draft");
    expect(prompt).toContain("Never call apply_approved_calendar_action unless the action is already approved.");
    expect(prompt).toContain("Recent conversation");
  });
});
