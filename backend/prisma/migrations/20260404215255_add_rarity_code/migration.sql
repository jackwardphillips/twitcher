-- CreateTable
CREATE TABLE "RarityCode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "commonName" TEXT NOT NULL,
    "scientificName" TEXT,
    "abaCode" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RarityCode_commonName_key" ON "RarityCode"("commonName");
