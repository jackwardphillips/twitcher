-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scientificName" TEXT NOT NULL,
    "commonName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "minLat" REAL NOT NULL,
    "maxLat" REAL NOT NULL,
    "minLng" REAL NOT NULL,
    "maxLng" REAL NOT NULL,
    "firstSeen" DATETIME NOT NULL,
    "lastSeen" DATETIME NOT NULL,
    "closedAt" DATETIME,
    "sightingCount" INTEGER NOT NULL DEFAULT 1,
    "primaryCounty" TEXT,
    "primaryState" TEXT,
    "primaryCountry" TEXT,
    "statesCovered" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sighting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "species" TEXT NOT NULL,
    "scientificName" TEXT,
    "location" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "observer" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL DEFAULT 0,
    "details" TEXT,
    "mapUrl" TEXT,
    "checklistUrl" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "subId" TEXT,
    "locId" TEXT,
    "speciesCode" TEXT,
    "howMany" INTEGER,
    "incidentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sighting_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Sighting" ("checklistUrl", "createdAt", "date", "details", "howMany", "id", "latitude", "locId", "location", "longitude", "mapUrl", "observer", "rarity", "scientificName", "species", "speciesCode", "subId", "updatedAt") SELECT "checklistUrl", "createdAt", "date", "details", "howMany", "id", "latitude", "locId", "location", "longitude", "mapUrl", "observer", "rarity", "scientificName", "species", "speciesCode", "subId", "updatedAt" FROM "Sighting";
DROP TABLE "Sighting";
ALTER TABLE "new_Sighting" RENAME TO "Sighting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
