/*
  Warnings:

  - You are about to drop the `playlist_videos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `playlists` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "playlist_videos" DROP CONSTRAINT "playlist_videos_playlist_id_fkey";

-- DropForeignKey
ALTER TABLE "playlist_videos" DROP CONSTRAINT "playlist_videos_video_id_fkey";

-- DropForeignKey
ALTER TABLE "playlists" DROP CONSTRAINT "playlists_user_id_fkey";

-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "playlist_videos";

-- DropTable
DROP TABLE "playlists";
