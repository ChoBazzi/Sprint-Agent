import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.");

export const dailyPlanRequestSchema = z.object({
  date: dateSchema,
  userInstruction: z.string().trim().max(500).optional()
});

export const assistantReviewRequestSchema = z.object({
  userInstruction: z.string().trim().max(500).optional(),
  applicationId: z.string().optional(),
  projectId: z.string().optional()
});

export const assistantSuggestionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rationale: z.string().min(1),
  suggestedActions: z.array(z.string().min(1)),
  affectedItemIds: z.array(z.string().min(1)),
  confidence: z.enum(["low", "medium", "high"])
});

export const assistantResponseSchema = z.object({
  summary: z.string().min(1),
  suggestions: z.array(assistantSuggestionSchema),
  warnings: z.array(z.string())
});

export type DailyPlanRequestInput = z.infer<typeof dailyPlanRequestSchema>;
export type AssistantReviewRequestInput = z.infer<typeof assistantReviewRequestSchema>;
