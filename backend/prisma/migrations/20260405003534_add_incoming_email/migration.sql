-- CreateTable
CREATE TABLE "IncomingEmail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "messageId" TEXT NOT NULL,
    "subject" TEXT,
    "from" TEXT,
    "date" DATETIME,
    "rawBody" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "IncomingEmail_messageId_key" ON "IncomingEmail"("messageId");
