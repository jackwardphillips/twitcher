-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'CLOSED', 'PERMANENTLY_CLOSED');

-- CreateTable
CREATE TABLE "Sighting" (
    "id" SERIAL NOT NULL,
    "species" TEXT NOT NULL,
    "scientificName" TEXT,
    "location" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "observer" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL DEFAULT 0,
    "details" TEXT,
    "mapUrl" TEXT,
    "checklistUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "subId" TEXT,
    "locId" TEXT,
    "speciesCode" TEXT,
    "howMany" INTEGER,
    "incidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sighting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "scientificName" TEXT NOT NULL,
    "commonName" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "minLat" DOUBLE PRECISION NOT NULL,
    "maxLat" DOUBLE PRECISION NOT NULL,
    "minLng" DOUBLE PRECISION NOT NULL,
    "maxLng" DOUBLE PRECISION NOT NULL,
    "firstSeen" TIMESTAMP(3) NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "sightingCount" INTEGER NOT NULL DEFAULT 1,
    "primaryCounty" TEXT,
    "primaryState" TEXT,
    "primaryCountry" TEXT,
    "statesCovered" TEXT NOT NULL,
    "geminiSummary" TEXT,
    "summaryGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RarityCode" (
    "id" SERIAL NOT NULL,
    "commonName" TEXT NOT NULL,
    "scientificName" TEXT,
    "abaCode" INTEGER NOT NULL,

    CONSTRAINT "RarityCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomingEmail" (
    "id" SERIAL NOT NULL,
    "messageId" TEXT NOT NULL,
    "subject" TEXT,
    "from" TEXT,
    "date" TIMESTAMP(3),
    "rawBody" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomingEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeciesPhoto" (
    "speciesName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "attribution" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeciesPhoto_pkey" PRIMARY KEY ("speciesName")
);

-- CreateIndex
CREATE UNIQUE INDEX "RarityCode_commonName_key" ON "RarityCode"("commonName");

-- CreateIndex
CREATE UNIQUE INDEX "RarityCode_scientificName_key" ON "RarityCode"("scientificName");

-- CreateIndex
CREATE UNIQUE INDEX "IncomingEmail_messageId_key" ON "IncomingEmail"("messageId");

-- AddForeignKey
ALTER TABLE "Sighting" ADD CONSTRAINT "Sighting_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
