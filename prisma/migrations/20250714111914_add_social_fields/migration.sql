/*
  Warnings:

  - You are about to drop the column `facebookId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `googleId` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_facebookId_key";

-- DropIndex
DROP INDEX "users_googleId_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "facebookId",
DROP COLUMN "googleId",
ADD COLUMN     "instagram" VARCHAR(100),
ADD COLUMN     "location" VARCHAR(100),
ADD COLUMN     "twitter" VARCHAR(100),
ADD COLUMN     "website" VARCHAR(200),
ADD COLUMN     "youtube" VARCHAR(100);
