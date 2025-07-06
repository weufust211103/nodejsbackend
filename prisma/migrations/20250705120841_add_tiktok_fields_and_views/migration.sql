/*
  Warnings:

  - A unique constraint covering the columns `[tiktok_id]` on the table `videos` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `videos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "is_app_content" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tiktok_comments" INTEGER DEFAULT 0,
ADD COLUMN     "tiktok_create_time" TIMESTAMP(3),
ADD COLUMN     "tiktok_id" VARCHAR(50),
ADD COLUMN     "tiktok_likes" INTEGER DEFAULT 0,
ADD COLUMN     "tiktok_shares" INTEGER DEFAULT 0,
ADD COLUMN     "updated_at" TIMESTAMP(3);

-- Update existing rows to set updated_at to created_at
UPDATE "videos" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;

-- Make updated_at NOT NULL after setting values
ALTER TABLE "videos" ALTER COLUMN "updated_at" SET NOT NULL;

-- CreateTable
CREATE TABLE "app_tiktok_tokens" (
    "id" UUID NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "open_id" VARCHAR(100) NOT NULL,
    "scope" VARCHAR(200) NOT NULL,
    "expires_in" INTEGER NOT NULL DEFAULT 7200,
    "token_created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_refreshed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_tiktok_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "videos_tiktok_id_key" ON "videos"("tiktok_id");
