import * as fs from 'fs';
import { parseABAChecklist } from './aba-parser';
import { prisma } from './db';

/**
 * Seeds the database with rarity codes from the ABA Checklist CSV.
 * @param csvPath The path to the ABA Checklist CSV file.
 */
export async function seedRarityCodes(csvPath: string): Promise<void> {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const birds = parseABAChecklist(csvContent);

  console.log(`Parsed ${birds.length} birds from CSV.`);

  for (const bird of birds) {
    if (bird.abaCode === null) {
      // Skip species without an ABA code, as our schema requires an Int.
      continue;
    }

    try {
      await prisma.rarityCode.upsert({
        where: { scientificName: bird.scientificName },
        update: {
          commonName: bird.commonName,
          abaCode: bird.abaCode,
        },
        create: {
          commonName: bird.commonName,
          scientificName: bird.scientificName,
          abaCode: bird.abaCode,
        },
      });
    } catch (error) {
      console.error(`Error upserting bird ${bird.commonName}:`, error);
    }
  }

  console.log('Finished seeding rarity codes.');
}
