import { prisma } from './db';

/**
 * Retrieves the ABA rarity code for a given species by its scientific name.
 * @param scientificName The scientific name of the species.
 * @returns The ABA rarity code (1-6) or null if the species is not found.
 */
export async function getRarityCodeByScientificName(scientificName: string): Promise<number | null> {
  const normalizedName = scientificName.trim();

  const record = await prisma.rarityCode.findUnique({
    where: { scientificName: normalizedName },
  });

  return record ? record.abaCode : null;
}
