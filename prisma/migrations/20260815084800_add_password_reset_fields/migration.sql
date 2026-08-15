-- AlterTable
ALTER TABLE "users" ADD COLUMN     "reset_token_expires" TIMESTAMPTZ,
ADD COLUMN     "reset_token_hash" TEXT;
