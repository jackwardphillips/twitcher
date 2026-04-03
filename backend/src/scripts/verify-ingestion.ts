import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseEBirdAlert } from '../lib/ebird-parser.js';
import { saveSightings } from '../lib/sighting-service.js';
import { prisma } from '../lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const samplePath = path.resolve(__dirname, '../../../references/[eBird Alert] ABA Rarities _daily_ (1).eml');

async function main() {
  console.log('--- Ingestion Verification ---');
  
  if (!process.env.EBIRD_API_KEY) {
    console.error('ERROR: EBIRD_API_KEY is not set in backend/.env');
    return;
  }
  
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
  console.log('Saved and enriched sightings.');

  const dbSightings = await prisma.sighting.findMany();
  const enrichedCount = dbSightings.filter(s => s.subId).length;
  console.log(`Verification complete: (${enrichedCount}/${dbSightings.length} enriched)`);
  
  console.log('\nSample Species & Enrichment:');
  dbSightings.slice(0, 5).forEach(s => {
    const enrichment = s.subId ? `[Enriched: ${s.subId}, ${s.latitude}, ${s.longitude}]` : '[Unenriched]';
    console.log(`- ${s.species} at ${s.location} ${enrichment}`);
  });

  const unenriched = dbSightings.filter(s => !s.subId);
  if (unenriched.length > 0) {
    console.log(`\nUnenriched Sightings (Sample of ${unenriched.length}):`);
    unenriched.slice(0, 10).forEach(s => {
      console.log(`- ${s.species} at ${s.location} (${s.date.toDateString()})`);
    });
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
