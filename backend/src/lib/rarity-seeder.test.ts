import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedRarityCodes } from './rarity-seeder';
import { prisma } from './db';
import * as fs from 'fs';
import { parseABAChecklist } from './aba-parser';

// Mock prisma
vi.mock('./db', () => ({
  prisma: {
    rarityCode: {
      upsert: vi.fn(),
    },
  },
}));

// Mock fs
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

// Mock aba-parser
vi.mock('./aba-parser', () => ({
  parseABAChecklist: vi.fn(),
}));

describe('Rarity Seeder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse the CSV and upsert rarity codes into the database', async () => {
    const csvPath = 'dummy.csv';
    const csvContent = 'commonName,scientificName,abaCode\nBird,Species,1';
    const mockBirds = [
      { commonName: 'Bird 1', scientificName: 'Species 1', abaCode: 1 },
      { commonName: 'Bird 2', scientificName: 'Species 2', abaCode: 2 },
    ];

    (fs.readFileSync as any).mockReturnValue(csvContent);
    (parseABAChecklist as any).mockReturnValue(mockBirds);

    await seedRarityCodes(csvPath);

    expect(fs.readFileSync).toHaveBeenCalledWith(csvPath, 'utf-8');
    expect(parseABAChecklist).toHaveBeenCalledWith(csvContent);
    expect(prisma.rarityCode.upsert).toHaveBeenCalledTimes(2);

    expect(prisma.rarityCode.upsert).toHaveBeenCalledWith({
      where: { scientificName: 'Species 1' },
      update: { commonName: 'Bird 1', abaCode: 1 },
      create: { commonName: 'Bird 1', scientificName: 'Species 1', abaCode: 1 },
    });

    expect(prisma.rarityCode.upsert).toHaveBeenCalledWith({
      where: { scientificName: 'Species 2' },
      update: { commonName: 'Bird 2', abaCode: 2 },
      create: { commonName: 'Bird 2', scientificName: 'Species 2', abaCode: 2 },
    });
  });

  it('should handle birds with null abaCode by skipping them or handling as needed', async () => {
    const mockBirds = [
      { commonName: 'Bird 1', scientificName: 'Species 1', abaCode: null },
    ];

    (parseABAChecklist as any).mockReturnValue(mockBirds);

    await seedRarityCodes('dummy.csv');

    // For now, let's assume we only seed if abaCode is present.
    // Or we could seed it as null if the schema allows. 
    // The schema says `abaCode Int`, so it might not allow null if not specified.
    // Let me check the schema again.
    // RarityCode { abaCode Int } -> not optional.
    
    expect(prisma.rarityCode.upsert).not.toHaveBeenCalled();
  });
});
