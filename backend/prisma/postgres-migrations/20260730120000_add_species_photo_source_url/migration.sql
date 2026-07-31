ALTER TABLE "SpeciesPhoto" ADD COLUMN "sourceUrl" TEXT;

UPDATE "SpeciesPhoto"
SET
  "photoUrl" = NULL,
  "attribution" = NULL,
  "fetchedAt" = TIMESTAMP '1970-01-01 00:00:00';
