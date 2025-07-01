/*
  Warnings:

  - A unique constraint covering the columns `[facebookId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[googleId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Made the column `is_liked` on table `likes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_live` on table `livestreams` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_from_livestream` on table `videos` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "channels" DROP CONSTRAINT "channels_user_id_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_video_id_fkey";

-- DropForeignKey
ALTER TABLE "follows" DROP CONSTRAINT "follows_channel_id_fkey";

-- DropForeignKey
ALTER TABLE "follows" DROP CONSTRAINT "follows_user_id_fkey";

-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "likes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "likes_video_id_fkey";

-- DropForeignKey
ALTER TABLE "livestream_chats" DROP CONSTRAINT "livestream_chats_livestream_id_fkey";

-- DropForeignKey
ALTER TABLE "livestream_chats" DROP CONSTRAINT "livestream_chats_user_id_fkey";

-- DropForeignKey
ALTER TABLE "livestream_comments" DROP CONSTRAINT "livestream_comments_livestream_id_fkey";

-- DropForeignKey
ALTER TABLE "livestream_comments" DROP CONSTRAINT "livestream_comments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "livestreams" DROP CONSTRAINT "livestreams_user_id_fkey";

-- DropForeignKey
ALTER TABLE "saved_videos" DROP CONSTRAINT "saved_videos_user_id_fkey";

-- DropForeignKey
ALTER TABLE "saved_videos" DROP CONSTRAINT "saved_videos_video_id_fkey";

-- DropForeignKey
ALTER TABLE "third_party_configs" DROP CONSTRAINT "third_party_configs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "video_tags" DROP CONSTRAINT "video_tags_tag_id_fkey";

-- DropForeignKey
ALTER TABLE "video_tags" DROP CONSTRAINT "video_tags_video_id_fkey";

-- DropForeignKey
ALTER TABLE "videos" DROP CONSTRAINT "videos_channel_id_fkey";

-- DropForeignKey
ALTER TABLE "videos" DROP CONSTRAINT "videos_livestream_id_fkey";

-- DropForeignKey
ALTER TABLE "videos" DROP CONSTRAINT "videos_user_id_fkey";

-- AlterTable
ALTER TABLE "channels" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "comments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "follows" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "likes" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "is_liked" SET NOT NULL;

-- AlterTable
ALTER TABLE "livestream_chats" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "livestream_comments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "livestreams" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "is_live" SET NOT NULL,
ALTER COLUMN "ended_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "saved_videos" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tags" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "third_party_configs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "facebookId" TEXT,
ADD COLUMN     "googleId" TEXT,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "video_tags" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "videos" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "is_from_livestream" SET NOT NULL;

-- CreateTable
CREATE TABLE "Entity" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_facebookId_key" ON "users"("facebookId");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "livestreams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_tags" ADD CONSTRAINT "video_tags_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_tags" ADD CONSTRAINT "video_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_videos" ADD CONSTRAINT "saved_videos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_videos" ADD CONSTRAINT "saved_videos_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livestreams" ADD CONSTRAINT "livestreams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livestream_comments" ADD CONSTRAINT "livestream_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livestream_comments" ADD CONSTRAINT "livestream_comments_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "livestreams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livestream_chats" ADD CONSTRAINT "livestream_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livestream_chats" ADD CONSTRAINT "livestream_chats_livestream_id_fkey" FOREIGN KEY ("livestream_id") REFERENCES "livestreams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "third_party_configs" ADD CONSTRAINT "third_party_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
