-- CreateEnum
CREATE TYPE "AssistantMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AssistantActionType" AS ENUM ('CREATE_CALENDAR_EVENT', 'DELETE_CALENDAR_EVENT');

-- CreateEnum
CREATE TYPE "AssistantActionStatus" AS ENUM ('PROPOSED', 'APPROVED', 'APPLIED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "CalendarLinkStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateTable
CREATE TABLE "AssistantConversation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "codexSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AssistantMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantAction" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "type" "AssistantActionType" NOT NULL,
    "status" "AssistantActionStatus" NOT NULL DEFAULT 'PROPOSED',
    "summary" TEXT,
    "description" TEXT,
    "startDateTime" TIMESTAMP(3),
    "endDateTime" TIMESTAMP(3),
    "timeZone" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "provider" TEXT,
    "calendarId" TEXT,
    "externalEventId" TEXT,
    "payload" JSONB,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEventLink" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "summary" TEXT NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "status" "CalendarLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "actionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEventLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssistantMessage_conversationId_createdAt_idx" ON "AssistantMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AssistantAction_conversationId_status_idx" ON "AssistantAction"("conversationId", "status");

-- CreateIndex
CREATE INDEX "AssistantAction_type_status_idx" ON "AssistantAction"("type", "status");

-- CreateIndex
CREATE INDEX "AssistantAction_externalEventId_idx" ON "AssistantAction"("externalEventId");

-- CreateIndex
CREATE INDEX "CalendarEventLink_sourceType_sourceId_idx" ON "CalendarEventLink"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "CalendarEventLink_status_idx" ON "CalendarEventLink"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEventLink_provider_calendarId_externalEventId_key" ON "CalendarEventLink"("provider", "calendarId", "externalEventId");

-- AddForeignKey
ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantAction" ADD CONSTRAINT "AssistantAction_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
