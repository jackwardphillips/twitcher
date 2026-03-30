import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseEBirdAlert } from '../lib/ebird-parser.js';
import { saveSightings } from '../lib/sighting-service.js';
import prisma from '../lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const samplePath = path.resolve(__dirname, '../../../references/[eBird Alert] ABA Rarities _daily_.eml');

async function main() {
  console.log('--- Ingestion Verification ---');
  
  if (!fs.existsSync(samplePath)) {
    console.error(`Sample email not found at ${samplePath}`);
    return;
  }

  const content = fs.readFileSync(samplePath, 'utf-8');
  const sightings = parseEBirdAlert(content);
  
  console.log(`Parsed ${sightings.length} sightings from sample email.`);
  
  // Clear DB first
  await prisma.sighting.deleteMany();
  
  await saveSightings(sightings);
  console.log('Saved sightings to database.');

  const dbSightings = await prisma.sighting.findMany();
  console.log(`Verified ${dbSightings.length} sightings in database.`);
  
  console.log('\nSample Species:');
  dbSightings.slice(0, 5).forEach(s => {
    console.log(`- ${s.species} at ${s.location} (${s.date.toDateString()})`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
