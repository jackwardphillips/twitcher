import path from 'path';
import { fileURLToPath } from 'url';
import { seedRarityCodes } from '../lib/rarity-seeder';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.resolve(__dirname, '../../../references/ABA_Checklist-8.19.csv');

async function main() {
  console.log('Starting ABA Checklist seeding script...');
  console.log(`Using CSV at: ${CSV_PATH}`);
  
  try {
    await seedRarityCodes(CSV_PATH);
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
  }
}

main();
