/*
  Warnings:

  - Added the required column `updated_at` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Application_job_id_idx";

-- DropIndex
DROP INDEX "Job_active_idx";

-- DropIndex
DROP INDEX "Swipe_target_user_id_idx";

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "cover_image_url" TEXT,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Application_job_id_status_idx" ON "Application"("job_id", "status");

-- CreateIndex
CREATE INDEX "Job_active_created_at_idx" ON "Job"("active", "created_at");

-- CreateIndex
CREATE INDEX "Swipe_target_user_id_direction_idx" ON "Swipe"("target_user_id", "direction");

-- CreateIndex
CREATE INDEX "User_role_id_idx" ON "User"("role", "id");
