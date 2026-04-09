import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRarityCodeByScientificName } from './rarity-service';
import { prisma } from './db';

// Mock prisma
vi.mock('./db', () => ({
  prisma: {
    rarityCode: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Rarity Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the ABA code for a known species scientific name', async () => {
    const mockRecord = {
      id: 1,
      commonName: 'Black-bellied Whistling-Duck',
      scientificName: 'Dendrocygna autumnalis',
      abaCode: 1,
    };

    (prisma.rarityCode.findUnique as any).mockResolvedValue(mockRecord);

    const rarity = await getRarityCodeByScientificName('Dendrocygna autumnalis');
    expect(rarity).toBe(1);
    expect(prisma.rarityCode.findUnique).toHaveBeenCalledWith({
      where: { scientificName: 'Dendrocygna autumnalis' },
    });
  });

  it('should return null if the species is not found', async () => {
    (prisma.rarityCode.findUnique as any).mockResolvedValue(null);

    const rarity = await getRarityCodeByScientificName('Non-existent Species');
    expect(rarity).toBeNull();
  });

  it('should handle normalization of scientific name (e.g., trimming)', async () => {
    const mockRecord = {
      id: 1,
      commonName: 'Black-bellied Whistling-Duck',
      scientificName: 'Dendrocygna autumnalis',
      abaCode: 1,
    };

    (prisma.rarityCode.findUnique as any).mockResolvedValue(mockRecord);

    const rarity = await getRarityCodeByScientificName('  Dendrocygna autumnalis  ');
    expect(rarity).toBe(1);
    expect(prisma.rarityCode.findUnique).toHaveBeenCalledWith({
      where: { scientificName: 'Dendrocygna autumnalis' },
    });
  });
});
