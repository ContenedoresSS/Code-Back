/*
  Warnings:

  - Added the required column `code_snapshot` to the `submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language_id` to the `submissions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_activity_id_fkey";

-- DropForeignKey
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_student_id_fkey";

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "code_snapshot" JSONB NOT NULL,
ADD COLUMN     "compiler_output" TEXT,
ADD COLUMN     "language_id" INTEGER NOT NULL,
ADD COLUMN     "passed_tests" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_tests" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "submissions_student_id_activity_id_idx" ON "submissions"("student_id", "activity_id");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "programming_languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
