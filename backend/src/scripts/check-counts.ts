import { prisma } from '../lib/db.js';

async function check() {
  const rarityCount = await prisma.rarityCode.count();
  const sightingCount = await prisma.sighting.count();
  const incidentCount = await prisma.incident.count();
  const emailCount = await prisma.incomingEmail.count();
  console.log(`RarityCodes: ${rarityCount}`);
  console.log(`Sightings: ${sightingCount}`);
  console.log(`Incidents: ${incidentCount}`);
  console.log(`IncomingEmails: ${emailCount}`);
  await prisma.$disconnect();
}

check().catch(console.error);
