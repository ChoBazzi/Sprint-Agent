import { describe, expect, it } from "vitest";
import {
  assertDraftActionConfirmation,
  AssistantConfirmationError
} from "../src/mcp/assistant-confirmation";

describe("assertDraftActionConfirmation", () => {
  it("accepts the final confirmation phrase for calendar creation drafts", () => {
    expect(() =>
      assertDraftActionConfirmation(
        "create_calendar_event",
        "오늘 18:00-19:00 test 일정 내용으로 추가하겠습니다."
      )
    ).not.toThrow();
  });

  it("accepts the final confirmation phrase for calendar deletion drafts", () => {
    expect(() =>
      assertDraftActionConfirmation(
        "delete_calendar_event",
        "Google Calendar의 test 일정 내용으로 삭제하겠습니다."
      )
    ).not.toThrow();
  });

  it("rejects a draft action without the required final confirmation phrase", () => {
    expect(() =>
      assertDraftActionConfirmation("create_calendar_event", "test 일정을 추가합니다.")
    ).toThrow(AssistantConfirmationError);
  });
});
