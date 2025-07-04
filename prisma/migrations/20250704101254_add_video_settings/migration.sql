-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "allow_comments" BOOLEAN DEFAULT true,
ADD COLUMN     "allow_download" BOOLEAN DEFAULT false,
ADD COLUMN     "scheduled_at" TIMESTAMP(3);
