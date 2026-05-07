-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IncomingEmail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "messageId" TEXT NOT NULL,
    "subject" TEXT,
    "from" TEXT,
    "date" DATETIME,
    "rawBody" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_IncomingEmail" ("createdAt", "date", "from", "id", "messageId", "rawBody", "status", "subject") SELECT "createdAt", "date", "from", "id", "messageId", "rawBody", "status", "subject" FROM "IncomingEmail";
DROP TABLE "IncomingEmail";
ALTER TABLE "new_IncomingEmail" RENAME TO "IncomingEmail";
CREATE UNIQUE INDEX "IncomingEmail_messageId_key" ON "IncomingEmail"("messageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
