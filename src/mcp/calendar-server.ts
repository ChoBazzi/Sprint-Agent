import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AssistantActionService } from "../server/assistant/action-service.js";
import { prisma } from "../server/storage/prisma.js";

const sourceTypeSchema = z
  .enum(["study", "application", "project", "sprint", "personal"])
  .optional();

const actionService = new AssistantActionService(prisma);

const server = new McpServer(
  {
    name: "personal-calendar-assistant",
    version: "0.1.0"
  },
  {
    instructions: [
    "Use this server to track calendar action drafts for the personal assistant app.",
    "Never apply a calendar action unless the action status is already approved.",
    "Prefer create_calendar_event_draft and delete_calendar_event_draft during normal chat.",
    "Return action ids to the user so the web UI can show approval controls."
    ].join(" ")
  }
);

server.registerTool(
  "ensure_assistant_conversation",
  {
    title: "Ensure assistant conversation",
    description: "Create an assistant conversation if the supplied id does not already exist.",
    inputSchema: {
      conversationId: z.string().optional(),
      title: z.string().optional()
    }
  },
  async (input) => {
    const conversation = await actionService.ensureConversation(input.conversationId, input.title);
    return toToolResult({
      message: "Assistant conversation is ready.",
      conversation
    });
  }
);

server.registerTool(
  "create_calendar_event_draft",
  {
    title: "Create Google Calendar event draft",
    description:
      "Create a tracked draft for a Google Calendar event. This does not write to Google Calendar until the user approves and applies the action.",
    inputSchema: {
      conversationId: z.string().min(1),
      summary: z.string().min(1),
      description: z.string().optional(),
      startDateTime: z.string().datetime({ offset: true }),
      endDateTime: z.string().datetime({ offset: true }),
      timeZone: z.string().min(1).default("Asia/Seoul"),
      sourceType: sourceTypeSchema,
      sourceId: z.string().optional()
    }
  },
  async (input) => {
    const action = await actionService.createCalendarEventDraft(input);
    return toToolResult({
      message: "Calendar event draft created.",
      action
    });
  }
);

server.registerTool(
  "delete_calendar_event_draft",
  {
    title: "Create Google Calendar delete draft",
    description:
      "Create a tracked draft for deleting a Google Calendar event. This does not delete anything until the user approves and applies the action.",
    inputSchema: {
      conversationId: z.string().min(1),
      externalEventId: z.string().min(1),
      provider: z.string().optional(),
      calendarId: z.string().optional(),
      summary: z.string().optional()
    }
  },
  async (input) => {
    const action = await actionService.createDeleteCalendarEventDraft(input);
    return toToolResult({
      message: "Calendar delete draft created.",
      action
    });
  }
);

server.registerTool(
  "list_calendar_actions",
  {
    title: "List tracked calendar actions",
    description: "List tracked calendar actions, optionally scoped to one assistant conversation.",
    inputSchema: {
      conversationId: z.string().optional()
    }
  },
  async (input) => {
    const actions = await actionService.listActions(input.conversationId);
    return toToolResult({
      message: "Tracked calendar actions loaded.",
      actions
    });
  }
);

server.registerTool(
  "apply_approved_calendar_action",
  {
    title: "Apply approved calendar action",
    description:
      "Apply a tracked calendar action only if it has already been approved by the user in the web UI.",
    inputSchema: {
      actionId: z.string().min(1)
    }
  },
  async (input) => {
    const action = await actionService.applyAction(input.actionId);
    return toToolResult({
      message: "Calendar action apply attempted.",
      action
    });
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

function toToolResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}
