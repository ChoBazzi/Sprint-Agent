export type AssistantSuggestion = {
  id: string;
  title: string;
  rationale: string;
  suggestedActions: string[];
  affectedItemIds: string[];
  confidence: "low" | "medium" | "high";
};

export type AssistantResponse = {
  summary: string;
  suggestions: AssistantSuggestion[];
  warnings: string[];
};

export type DailyPlanRequest = {
  date: string;
  userInstruction?: string;
};
