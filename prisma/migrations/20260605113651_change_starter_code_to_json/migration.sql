/*
  Warnings:

  - The `starter_code` column on the `activities` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "activities" DROP COLUMN "starter_code",
ADD COLUMN     "starter_code" JSONB;
