/*
  Warnings:

  - You are about to drop the column `channel_id` on the `follows` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `follows` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `likes` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `livestreams` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `videos` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[follower_id,followee_id]` on the table `follows` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[channel_id,video_id]` on the table `likes` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "follows" DROP CONSTRAINT "follows_channel_id_fkey";

-- DropForeignKey
ALTER TABLE "follows" DROP CONSTRAINT "follows_user_id_fkey";

-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "likes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "livestreams" DROP CONSTRAINT "livestreams_user_id_fkey";

-- DropForeignKey
ALTER TABLE "videos" DROP CONSTRAINT "videos_channel_id_fkey";

-- DropForeignKey
ALTER TABLE "videos" DROP CONSTRAINT "videos_user_id_fkey";

-- DropIndex
DROP INDEX "follows_user_id_channel_id_key";

-- DropIndex
DROP INDEX "likes_user_id_video_id_key";

-- AlterTable
ALTER TABLE "follows" DROP COLUMN "channel_id",
DROP COLUMN "user_id",
ADD COLUMN     "followee_id" UUID,
ADD COLUMN     "follower_id" UUID;

-- AlterTable
ALTER TABLE "likes" DROP COLUMN "user_id",
ADD COLUMN     "channel_id" UUID;

-- AlterTable
ALTER TABLE "livestreams" DROP COLUMN "user_id",
ADD COLUMN     "channel_id" UUID;

-- AlterTable
ALTER TABLE "videos" DROP COLUMN "user_id";

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_followee_id_key" ON "follows"("follower_id", "followee_id");

-- CreateIndex
CREATE UNIQUE INDEX "likes_channel_id_video_id_key" ON "likes"("channel_id", "video_id");

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followee_id_fkey" FOREIGN KEY ("followee_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livestreams" ADD CONSTRAINT "livestreams_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
