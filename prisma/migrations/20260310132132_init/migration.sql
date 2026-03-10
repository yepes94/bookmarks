-- CreateTable
CREATE TABLE "SaintImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saintId" TEXT NOT NULL,
    "userId" TEXT,
    "dataUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
