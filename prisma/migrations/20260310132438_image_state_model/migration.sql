/*
  Warnings:

  - You are about to drop the `SaintImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SaintImage";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ImageState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "customImagesJson" TEXT NOT NULL DEFAULT '{}',
    "galleryJson" TEXT NOT NULL DEFAULT '{}',
    "backgroundPoolJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageState_userId_key" ON "ImageState"("userId");
