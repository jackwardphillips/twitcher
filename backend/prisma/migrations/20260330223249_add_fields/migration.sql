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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Sighting" ("createdAt", "date", "details", "id", "location", "observer", "rarity", "species", "updatedAt") SELECT "createdAt", "date", "details", "id", "location", "observer", "rarity", "species", "updatedAt" FROM "Sighting";
DROP TABLE "Sighting";
ALTER TABLE "new_Sighting" RENAME TO "Sighting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
