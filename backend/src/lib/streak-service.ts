import { prisma } from './db.js';

/**
 * Calculates the number of consecutive days a species has been reported at a location,
 * counting backwards from a reference date.
 */
export async function calculateStreak(species: string, location: string, referenceDate: Date): Promise<number> {
  const sightings = await prisma.sighting.findMany({
    where: {
      species,
      location,
      date: {
        lte: referenceDate,
      },
    },
    select: {
      date: true,
    },
    orderBy: {
      date: 'desc',
    },
  });

  if (sightings.length === 0) return 0;

  // Normalize dates to YYYY-MM-DD to handle multiple sightings per day
  const uniqueDates = new Set<string>();
  for (const s of sightings) {
    const datePart = s.date.toISOString().split('T')[0];
    if (datePart) uniqueDates.add(datePart);
  }

  const sortedDates = Array.from(uniqueDates).sort().reverse();
  const refDateStr = referenceDate.toISOString().split('T')[0] || '';

  // If the reference date itself doesn't have a sighting, the streak is 0 
  // (or maybe it should look at the most recent sighting before it? 
  // But usually we call this for a specific sighting).
  if (refDateStr === '' || !uniqueDates.has(refDateStr)) {
    // If it's not in uniqueDates but we have sightings, maybe the referenceDate is just after a sighting?
    // For this app, we'll assume we want the streak ending AT the reference date.
    return 0;
  }

  let streak = 0;
  let currentDate = new Date(`${refDateStr}T12:00:00`);

  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (dateStr && uniqueDates.has(dateStr)) {
      streak++;
      // Move to previous day
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
