export type AssistantDraftActionKind = "create_calendar_event" | "delete_calendar_event";

const requiredPhrases: Record<AssistantDraftActionKind, string> = {
  create_calendar_event: "내용으로 추가하겠습니다",
  delete_calendar_event: "내용으로 삭제하겠습니다"
};

export class AssistantConfirmationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssistantConfirmationError";
  }
}

export function assertDraftActionConfirmation(
  kind: AssistantDraftActionKind,
  confirmationMessage: string
): void {
  const requiredPhrase = requiredPhrases[kind];
  if (!confirmationMessage.includes(requiredPhrase)) {
    throw new AssistantConfirmationError(
      `Confirmation message must include "${requiredPhrase}".`
    );
  }
}
