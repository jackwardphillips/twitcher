import { prisma } from './db';

/**
 * Retrieves the ABA rarity code for a given species by its common name.
 * @param commonName The common name of the species.
 * @returns The ABA rarity code (1-6) or null if the species is not found.
 */
export async function getRarityCode(commonName: string): Promise<number | null> {
  const normalizedName = commonName.trim();

  const record = await prisma.rarityCode.findUnique({
    where: { commonName: normalizedName },
  });

  return record ? record.abaCode : null;
}
