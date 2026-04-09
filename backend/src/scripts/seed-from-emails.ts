import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseEBirdAlert } from '../lib/ebird-parser.js';
import { saveSightings } from '../lib/sighting-service.js';
import { prisma } from '../lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const referencesDir = path.resolve(__dirname, '../../../references');

async function main() {
  console.log('--- Seeding from Local Emails ---');
  
  const files = fs.readdirSync(referencesDir).filter(f => f.endsWith('.eml'));
  
  if (files.length === 0) {
    console.log('No .eml files found in references directory.');
    return;
  }

  for (const file of files) {
    const filePath = path.join(referencesDir, file);
    console.log(`Processing ${file}...`);
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const sightings = parseEBirdAlert(content);
    
    console.log(`Parsed ${sightings.length} sightings from ${file}.`);
    
    if (sightings.length > 0) {
      await saveSightings(sightings, false);
      console.log(`Saved ${sightings.length} sightings (enrichment disabled).`);
    }
  }

  console.log('--- Seeding complete ---');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
