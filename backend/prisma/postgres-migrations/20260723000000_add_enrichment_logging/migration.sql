-- CreateTable
CREATE TABLE "EmailIngestionAttempt" (
    "id" TEXT NOT NULL,
    "ingestionRunId" TEXT NOT NULL,
    "incomingEmailId" INTEGER,
    "messageId" TEXT NOT NULL,
    "subject" TEXT,
    "from" TEXT,
    "emailDate" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "parsedSightings" INTEGER NOT NULL DEFAULT 0,
    "parsedSummary" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "EmailIngestionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrichmentAttempt" (
    "id" TEXT NOT NULL,
    "ingestionRunId" TEXT,
    "emailAttemptId" TEXT,
    "sightingId" INTEGER,
    "species" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "sightingDate" TIMESTAMP(3) NOT NULL,
    "strategy" TEXT,
    "regionCode" TEXT,
    "status" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "apiCandidateCount" INTEGER NOT NULL DEFAULT 0,
    "speciesMatchCount" INTEGER NOT NULL DEFAULT 0,
    "timeWindowMatchCount" INTEGER NOT NULL DEFAULT 0,
    "selectedSubId" TEXT,
    "selectedSpecies" TEXT,
    "selectedLocation" TEXT,
    "selectedObsDt" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "EnrichmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EbirdApiCallLog" (
    "id" TEXT NOT NULL,
    "ingestionRunId" TEXT,
    "enrichmentAttemptId" TEXT,
    "endpoint" TEXT NOT NULL,
    "paramsJson" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "durationMs" INTEGER NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "maxAttempts" INTEGER NOT NULL,
    "responseItemCount" INTEGER,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EbirdApiCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailIngestionAttempt_ingestionRunId_idx" ON "EmailIngestionAttempt"("ingestionRunId");
CREATE INDEX "EmailIngestionAttempt_incomingEmailId_idx" ON "EmailIngestionAttempt"("incomingEmailId");
CREATE INDEX "EmailIngestionAttempt_messageId_idx" ON "EmailIngestionAttempt"("messageId");
CREATE INDEX "EmailIngestionAttempt_status_idx" ON "EmailIngestionAttempt"("status");
CREATE INDEX "EmailIngestionAttempt_startedAt_idx" ON "EmailIngestionAttempt"("startedAt");

CREATE INDEX "EnrichmentAttempt_ingestionRunId_idx" ON "EnrichmentAttempt"("ingestionRunId");
CREATE INDEX "EnrichmentAttempt_emailAttemptId_idx" ON "EnrichmentAttempt"("emailAttemptId");
CREATE INDEX "EnrichmentAttempt_sightingId_idx" ON "EnrichmentAttempt"("sightingId");
CREATE INDEX "EnrichmentAttempt_species_idx" ON "EnrichmentAttempt"("species");
CREATE INDEX "EnrichmentAttempt_regionCode_idx" ON "EnrichmentAttempt"("regionCode");
CREATE INDEX "EnrichmentAttempt_status_idx" ON "EnrichmentAttempt"("status");
CREATE INDEX "EnrichmentAttempt_rejectionReason_idx" ON "EnrichmentAttempt"("rejectionReason");
CREATE INDEX "EnrichmentAttempt_startedAt_idx" ON "EnrichmentAttempt"("startedAt");

CREATE INDEX "EbirdApiCallLog_ingestionRunId_idx" ON "EbirdApiCallLog"("ingestionRunId");
CREATE INDEX "EbirdApiCallLog_enrichmentAttemptId_idx" ON "EbirdApiCallLog"("enrichmentAttemptId");
CREATE INDEX "EbirdApiCallLog_endpoint_idx" ON "EbirdApiCallLog"("endpoint");
CREATE INDEX "EbirdApiCallLog_httpStatus_idx" ON "EbirdApiCallLog"("httpStatus");
CREATE INDEX "EbirdApiCallLog_startedAt_idx" ON "EbirdApiCallLog"("startedAt");

-- AddForeignKey
ALTER TABLE "EmailIngestionAttempt" ADD CONSTRAINT "EmailIngestionAttempt_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailIngestionAttempt" ADD CONSTRAINT "EmailIngestionAttempt_incomingEmailId_fkey" FOREIGN KEY ("incomingEmailId") REFERENCES "IncomingEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EnrichmentAttempt" ADD CONSTRAINT "EnrichmentAttempt_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnrichmentAttempt" ADD CONSTRAINT "EnrichmentAttempt_emailAttemptId_fkey" FOREIGN KEY ("emailAttemptId") REFERENCES "EmailIngestionAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EnrichmentAttempt" ADD CONSTRAINT "EnrichmentAttempt_sightingId_fkey" FOREIGN KEY ("sightingId") REFERENCES "Sighting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EbirdApiCallLog" ADD CONSTRAINT "EbirdApiCallLog_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EbirdApiCallLog" ADD CONSTRAINT "EbirdApiCallLog_enrichmentAttemptId_fkey" FOREIGN KEY ("enrichmentAttemptId") REFERENCES "EnrichmentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
