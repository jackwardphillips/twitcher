CREATE TABLE "AlertTarget" (
    "id" TEXT NOT NULL,
    "speciesName" TEXT NOT NULL,
    "speciesCode" TEXT,
    "regionName" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "expectedReports" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sourceEmailId" INTEGER,
    "firstSeenInEmailAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenInEmailAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPolledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertTarget_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Sighting" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'present';
ALTER TABLE "Sighting" ADD COLUMN "missingSince" TIMESTAMP(3);
ALTER TABLE "Sighting" ADD COLUMN "missingPollCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Sighting" ADD COLUMN "removedAt" TIMESTAMP(3);
ALTER TABLE "Sighting" ADD COLUMN "displayCounty" TEXT;
ALTER TABLE "Sighting" ADD COLUMN "displayState" TEXT;
ALTER TABLE "Sighting" ADD COLUMN "displayCountry" TEXT;
ALTER TABLE "Sighting" ADD COLUMN "locationResolutionSource" TEXT;

CREATE TABLE "AlertTargetPollAttempt" (
    "id" TEXT NOT NULL,
    "alertPollRunId" TEXT,
    "alertTargetId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "speciesName" TEXT NOT NULL,
    "speciesCode" TEXT,
    "regionName" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "expectedReports" INTEGER NOT NULL DEFAULT 0,
    "observationsFound" INTEGER NOT NULL DEFAULT 0,
    "sightingsCreated" INTEGER NOT NULL DEFAULT 0,
    "incidentsTouched" INTEGER NOT NULL DEFAULT 0,
    "observationsMissing" INTEGER NOT NULL DEFAULT 0,
    "observationsRemoved" INTEGER NOT NULL DEFAULT 0,
    "observationsRestored" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "AlertTargetPollAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AlertPollRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "backDays" INTEGER NOT NULL DEFAULT 3,
    "targetsPolled" INTEGER NOT NULL DEFAULT 0,
    "totalExpectedReports" INTEGER NOT NULL DEFAULT 0,
    "totalObservationsFound" INTEGER NOT NULL DEFAULT 0,
    "zeroObservationTargets" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "AlertPollRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AlertTargetObservation" (
    "id" TEXT NOT NULL,
    "alertTargetId" TEXT NOT NULL,
    "subId" TEXT NOT NULL,
    "locId" TEXT,
    "speciesCode" TEXT NOT NULL,
    "commonName" TEXT NOT NULL,
    "scientificName" TEXT,
    "locationName" TEXT NOT NULL,
    "obsDt" TEXT NOT NULL,
    "howMany" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "displayCounty" TEXT,
    "displayState" TEXT,
    "displayCountry" TEXT,
    "locationResolutionSource" TEXT,
    "status" TEXT NOT NULL DEFAULT 'present',
    "missingSince" TIMESTAMP(3),
    "missingPollCount" INTEGER NOT NULL DEFAULT 0,
    "removedAt" TIMESTAMP(3),
    "lastSeenInPollRunId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertTargetObservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AlertTarget_speciesName_regionCode_key" ON "AlertTarget"("speciesName", "regionCode");
CREATE INDEX "Sighting_status_idx" ON "Sighting"("status");
CREATE INDEX "Sighting_removedAt_idx" ON "Sighting"("removedAt");
CREATE INDEX "AlertTarget_status_idx" ON "AlertTarget"("status");
CREATE INDEX "AlertTarget_regionCode_idx" ON "AlertTarget"("regionCode");
CREATE INDEX "AlertTarget_speciesCode_idx" ON "AlertTarget"("speciesCode");
CREATE INDEX "AlertTarget_lastSeenInEmailAt_idx" ON "AlertTarget"("lastSeenInEmailAt");
CREATE INDEX "AlertTarget_lastPolledAt_idx" ON "AlertTarget"("lastPolledAt");
CREATE INDEX "AlertPollRun_startedAt_idx" ON "AlertPollRun"("startedAt");
CREATE INDEX "AlertPollRun_status_idx" ON "AlertPollRun"("status");
CREATE INDEX "AlertTargetPollAttempt_alertPollRunId_idx" ON "AlertTargetPollAttempt"("alertPollRunId");
CREATE INDEX "AlertTargetPollAttempt_alertTargetId_idx" ON "AlertTargetPollAttempt"("alertTargetId");
CREATE INDEX "AlertTargetPollAttempt_speciesName_idx" ON "AlertTargetPollAttempt"("speciesName");
CREATE INDEX "AlertTargetPollAttempt_regionCode_idx" ON "AlertTargetPollAttempt"("regionCode");
CREATE INDEX "AlertTargetPollAttempt_status_idx" ON "AlertTargetPollAttempt"("status");
CREATE INDEX "AlertTargetPollAttempt_startedAt_idx" ON "AlertTargetPollAttempt"("startedAt");
CREATE UNIQUE INDEX "AlertTargetObservation_alertTargetId_subId_key" ON "AlertTargetObservation"("alertTargetId", "subId");
CREATE INDEX "AlertTargetObservation_alertTargetId_idx" ON "AlertTargetObservation"("alertTargetId");
CREATE INDEX "AlertTargetObservation_speciesCode_idx" ON "AlertTargetObservation"("speciesCode");
CREATE INDEX "AlertTargetObservation_subId_idx" ON "AlertTargetObservation"("subId");
CREATE INDEX "AlertTargetObservation_status_idx" ON "AlertTargetObservation"("status");
CREATE INDEX "AlertTargetObservation_missingSince_idx" ON "AlertTargetObservation"("missingSince");
CREATE INDEX "AlertTargetObservation_removedAt_idx" ON "AlertTargetObservation"("removedAt");
CREATE INDEX "AlertTargetObservation_lastSeenInPollRunId_idx" ON "AlertTargetObservation"("lastSeenInPollRunId");
CREATE INDEX "AlertTargetObservation_lastSeenAt_idx" ON "AlertTargetObservation"("lastSeenAt");

ALTER TABLE "AlertTarget" ADD CONSTRAINT "AlertTarget_sourceEmailId_fkey" FOREIGN KEY ("sourceEmailId") REFERENCES "IncomingEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AlertTargetPollAttempt" ADD CONSTRAINT "AlertTargetPollAttempt_alertPollRunId_fkey" FOREIGN KEY ("alertPollRunId") REFERENCES "AlertPollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertTargetPollAttempt" ADD CONSTRAINT "AlertTargetPollAttempt_alertTargetId_fkey" FOREIGN KEY ("alertTargetId") REFERENCES "AlertTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertTargetObservation" ADD CONSTRAINT "AlertTargetObservation_alertTargetId_fkey" FOREIGN KEY ("alertTargetId") REFERENCES "AlertTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertTargetObservation" ADD CONSTRAINT "AlertTargetObservation_lastSeenInPollRunId_fkey" FOREIGN KEY ("lastSeenInPollRunId") REFERENCES "AlertPollRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
