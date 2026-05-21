import { db } from '../lib/db';

/**
 * Clears all transaction-safe data from the database.
 * Useful for ensuring a clean state between tests while preserving reference data.
 * @returns {Promise<void>}
 */
export async function clearDatabase() {
  // Order matters if there are foreign key constraints, 
  // but with SQLite and Prisma we can often just delete all.
  // Sighting has a relation to Incident.
  
  await db.sighting.deleteMany();
  await db.incident.deleteMany();
  await db.incomingEmail.deleteMany();
  await db.speciesPhoto.deleteMany();
  
  // RarityCode is usually seeded data, but we can clear it too if we want a TRULY empty DB.
  // For now, let's keep it as seeded data might be used by multiple tests.
}

/**
 * Resets the database to a completely empty state, including reference data like RarityCodes.
 * @returns {Promise<void>}
 */
export async function resetDatabase() {
  await clearDatabase();
  await db.rarityCode.deleteMany();
}
