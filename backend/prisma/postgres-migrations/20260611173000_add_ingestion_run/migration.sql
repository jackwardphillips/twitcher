-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "emailsFound" INTEGER NOT NULL DEFAULT 0,
    "emailsIngested" INTEGER NOT NULL DEFAULT 0,
    "sightingsAdded" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "trigger" TEXT,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngestionRun_startedAt_idx" ON "IngestionRun"("startedAt");
