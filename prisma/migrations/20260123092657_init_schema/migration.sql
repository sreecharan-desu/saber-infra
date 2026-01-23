-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('pending', 'reviewing', 'interview', 'accepted', 'rejected', 'withdrawn');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "OAuthAccount" ADD COLUMN     "access_token" TEXT,
ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "refresh_token" TEXT;

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'pending',
    "cover_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "Bookmark_user_id_idx" ON "Bookmark"("user_id");

-- CreateIndex
CREATE INDEX "Bookmark_job_id_idx" ON "Bookmark"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_user_id_job_id_key" ON "Bookmark"("user_id", "job_id");

-- CreateIndex
CREATE INDEX "Application_user_id_idx" ON "Application"("user_id");

-- CreateIndex
CREATE INDEX "Application_job_id_idx" ON "Application"("job_id");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Application_user_id_job_id_key" ON "Application"("user_id", "job_id");

-- CreateIndex
CREATE INDEX "Company_recruiter_id_idx" ON "Company"("recruiter_id");

-- CreateIndex
CREATE INDEX "Job_company_id_idx" ON "Job"("company_id");

-- CreateIndex
CREATE INDEX "Job_active_idx" ON "Job"("active");

-- CreateIndex
CREATE INDEX "Match_candidate_id_idx" ON "Match"("candidate_id");

-- CreateIndex
CREATE INDEX "Match_job_id_idx" ON "Match"("job_id");

-- CreateIndex
CREATE INDEX "Message_match_id_idx" ON "Message"("match_id");

-- CreateIndex
CREATE INDEX "Message_sender_id_idx" ON "Message"("sender_id");

-- CreateIndex
CREATE INDEX "OAuthAccount_user_id_idx" ON "OAuthAccount"("user_id");

-- CreateIndex
CREATE INDEX "Skill_user_id_idx" ON "Skill"("user_id");

-- CreateIndex
CREATE INDEX "Swipe_job_id_idx" ON "Swipe"("job_id");

-- CreateIndex
CREATE INDEX "Swipe_target_user_id_idx" ON "Swipe"("target_user_id");

-- CreateIndex
CREATE INDEX "Swipe_user_id_direction_idx" ON "Swipe"("user_id", "direction");

-- CreateIndex
CREATE INDEX "Swipe_direction_idx" ON "Swipe"("direction");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
