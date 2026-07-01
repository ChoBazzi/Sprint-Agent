export type AssistantMessageRole = "user" | "assistant" | "system";

export type AssistantActionType =
  | "create_calendar_event"
  | "update_calendar_event"
  | "delete_calendar_event";

export type AssistantActionStatus =
  | "proposed"
  | "approved"
  | "applied"
  | "rejected"
  | "failed";

export type AssistantConversation = {
  id: string;
  title: string;
  codexSessionId?: string;
  createdAt: string;
  updatedAt: string;
};

export type AssistantMessage = {
  id: string;
  conversationId: string;
  role: AssistantMessageRole;
  content: string;
  createdAt: string;
};

export type AssistantAction = {
  id: string;
  conversationId: string;
  type: AssistantActionType;
  status: AssistantActionStatus;
  summary?: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  timeZone?: string;
  sourceType?: string;
  sourceId?: string;
  provider?: string;
  calendarId?: string;
  externalEventId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type AssistantConversationDetail = {
  conversation: AssistantConversation;
  messages: AssistantMessage[];
  actions: AssistantAction[];
};

export type AssistantChatResponse = AssistantConversationDetail & {
  assistantMessage: AssistantMessage;
};
