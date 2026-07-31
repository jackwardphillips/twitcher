ALTER TABLE "Incident"
ADD COLUMN "pollRegionName" TEXT,
ADD COLUMN "pollRegionCode" TEXT;

ALTER TABLE "IncomingEmail"
ADD COLUMN "pollTargetsHandledAt" TIMESTAMP(3);

CREATE INDEX "IncomingEmail_pollTargetsHandledAt_idx"
ON "IncomingEmail"("pollTargetsHandledAt");
