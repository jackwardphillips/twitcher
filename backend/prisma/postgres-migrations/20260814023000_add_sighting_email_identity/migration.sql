ALTER TABLE "Sighting"
ADD COLUMN "incomingEmailId" INTEGER,
ADD COLUMN "sourceIndex" INTEGER;

ALTER TABLE "Sighting"
ADD CONSTRAINT "Sighting_incomingEmailId_fkey"
FOREIGN KEY ("incomingEmailId") REFERENCES "IncomingEmail"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Sighting_incomingEmailId_sourceIndex_key"
ON "Sighting"("incomingEmailId", "sourceIndex");
