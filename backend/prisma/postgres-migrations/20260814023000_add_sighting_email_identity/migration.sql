ALTER TABLE "Sighting"
ADD COLUMN "incomingEmailId" INTEGER,
ADD COLUMN "sourceIndex" INTEGER;

ALTER TABLE "IncomingEmail"
ADD COLUMN "legacyRetryEligible" BOOLEAN NOT NULL DEFAULT false;

UPDATE "IncomingEmail"
SET "legacyRetryEligible" = true
WHERE "status" IN ('new', 'failed', 'processing');

ALTER TABLE "Sighting"
ADD CONSTRAINT "Sighting_incomingEmailId_fkey"
FOREIGN KEY ("incomingEmailId") REFERENCES "IncomingEmail"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Sighting_incomingEmailId_sourceIndex_key"
ON "Sighting"("incomingEmailId", "sourceIndex");
