/*
  Warnings:

  - Added the required column `editor_identifier` to the `programming_languages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "programming_languages" ADD COLUMN     "editor_identifier" VARCHAR(50) NOT NULL;
