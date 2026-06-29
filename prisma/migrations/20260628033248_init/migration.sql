-- CreateEnum
CREATE TYPE "WorkItemStatus" AS ENUM ('BACKLOG', 'PLANNED', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('INTERESTED', 'PREPARING', 'APPLIED', 'CODING_TEST', 'INTERVIEW', 'OFFER', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StudyStatus" AS ENUM ('BACKLOG', 'PLANNED', 'IN_PROGRESS', 'REVIEWING', 'DONE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('IDEA', 'ACTIVE', 'BLOCKED', 'POLISHING', 'READY', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "capacity" INTEGER,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkItem" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkItemStatus" NOT NULL DEFAULT 'BACKLOG',
    "area" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "estimate" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "blocker" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "postingUrl" TEXT,
    "deadline" TIMESTAMP(3),
    "status" "ApplicationStatus" NOT NULL DEFAULT 'INTERESTED',
    "resumeVersionId" TEXT,
    "nextAction" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetRole" TEXT,
    "changeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyItem" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "resource" TEXT,
    "targetDate" TIMESTAMP(3),
    "estimatedHours" INTEGER,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "StudyStatus" NOT NULL DEFAULT 'BACKLOG',
    "reviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "stack" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'IDEA',
    "nextAction" TEXT,
    "hasReadme" BOOLEAN NOT NULL DEFAULT false,
    "hasDemo" BOOLEAN NOT NULL DEFAULT false,
    "hasDeployment" BOOLEAN NOT NULL DEFAULT false,
    "hasTests" BOOLEAN NOT NULL DEFAULT false,
    "portfolioReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sprint_isActive_idx" ON "Sprint"("isActive");

-- CreateIndex
CREATE INDEX "Sprint_startsOn_endsOn_idx" ON "Sprint"("startsOn", "endsOn");

-- CreateIndex
CREATE INDEX "WorkItem_sprintId_status_idx" ON "WorkItem"("sprintId", "status");

-- CreateIndex
CREATE INDEX "WorkItem_dueDate_idx" ON "WorkItem"("dueDate");

-- CreateIndex
CREATE INDEX "WorkItem_area_idx" ON "WorkItem"("area");

-- CreateIndex
CREATE INDEX "JobApplication_deadline_idx" ON "JobApplication"("deadline");

-- CreateIndex
CREATE INDEX "JobApplication_status_idx" ON "JobApplication"("status");

-- CreateIndex
CREATE INDEX "StudyItem_targetDate_idx" ON "StudyItem"("targetDate");

-- CreateIndex
CREATE INDEX "StudyItem_status_idx" ON "StudyItem"("status");

-- CreateIndex
CREATE INDEX "PortfolioProject_status_idx" ON "PortfolioProject"("status");

-- CreateIndex
CREATE INDEX "PortfolioProject_portfolioReady_idx" ON "PortfolioProject"("portfolioReady");

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
