import { PrismaClient, Incident, Sighting, IncidentStatus } from '@prisma/client';
import { calculateDistance } from './geo-utils.js';

/**
 * Normalizes a scientific name by stripping parenthetical qualifiers and trimming whitespace.
 * Example: "Lonchura malacca (Exotic: Naturalized)" -> "Lonchura malacca"
 */
export function normalizeScientificName(raw: string): string {
  if (!raw) return '';
  // Remove content within parentheses and the parentheses themselves
  // Handle nested or multiple sets by using global flag
  return raw.replace(/\s*\(.*?\)/g, '').trim();
}

/**
 * Finds a matching OPEN or CLOSED incident for a given scientific name and coordinates.
 * An incident matches if it has the same scientific name and at least one sighting 
 * within 10km of the provided coordinates.
 * OPEN incidents are prioritized over CLOSED ones.
 */
export async function findMatchingIncident(
  prisma: PrismaClient,
  scientificName: string,
  latitude: number,
  longitude: number
): Promise<(Incident & { sightings: Sighting[] }) | null> {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return null;
  }

  // Find all candidate incidents with the same scientific name that are not permanently closed
  const candidates = await prisma.incident.findMany({
    where: {
      scientificName,
      status: {
        in: [IncidentStatus.OPEN, IncidentStatus.CLOSED]
      }
    },
    include: {
      sightings: true
    }
  });

  if (candidates.length === 0) {
    return null;
  }

  // Filter candidates by proximity (within 10km of ANY existing sighting in the incident)
  const matchingCandidates = candidates.filter(incident => {
    return incident.sightings.some(sighting => {
      if (sighting.latitude === null || sighting.longitude === null) return false;
      const dist = calculateDistance(latitude, longitude, sighting.latitude, sighting.longitude);
      return dist <= 10;
    });
  });

  if (matchingCandidates.length === 0) {
    return null;
  }

  // Prioritize OPEN over CLOSED
  matchingCandidates.sort((a, b) => {
    if (a.status === IncidentStatus.OPEN && b.status !== IncidentStatus.OPEN) return -1;
    if (a.status !== IncidentStatus.OPEN && b.status === IncidentStatus.OPEN) return 1;
    return 0;
  });

  return matchingCandidates[0]!;
}
