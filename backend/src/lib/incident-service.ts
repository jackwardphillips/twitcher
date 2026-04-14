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

/**
 * Creates a new incident based on an initial sighting.
 */
export async function createIncident(
  prisma: PrismaClient,
  sighting: Sighting
): Promise<Incident> {
  const normScientific = normalizeScientificName(sighting.scientificName || sighting.species);
  
  // Extract location components if possible (format: "Location, County, State, Country")
  const parts = sighting.location.split(',').map(p => p.trim());
  const primaryCounty = parts.length >= 2 ? parts[parts.length - 3] : null;
  const primaryState = parts.length >= 2 ? parts[parts.length - 2] : null;
  const primaryCountry = parts.length >= 1 ? parts[parts.length - 1] : null;
  const statesCovered = primaryState ? [primaryState] : [];

  return await prisma.incident.create({
    data: {
      scientificName: normScientific,
      commonName: sighting.species,
      status: IncidentStatus.OPEN,
      minLat: sighting.latitude!,
      maxLat: sighting.latitude!,
      minLng: sighting.longitude!,
      maxLng: sighting.longitude!,
      firstSeen: sighting.date,
      lastSeen: sighting.date,
      sightingCount: 1,
      primaryCounty,
      primaryState,
      primaryCountry,
      statesCovered: JSON.stringify(statesCovered),
      sightings: {
        connect: { id: sighting.id }
      }
    }
  });
}

/**
 * Adds a sighting to an existing incident and updates the incident's summary data.
 */
export async function addSightingToIncident(
  prisma: PrismaClient,
  incident: Incident,
  sighting: Sighting
): Promise<Incident> {
  if (incident.status === IncidentStatus.PERMANENTLY_CLOSED) {
    throw new Error('Cannot add sighting to PERMANENTLY_CLOSED incident');
  }

  const currentStates: string[] = JSON.parse(incident.statesCovered);
  const parts = sighting.location.split(',').map(p => p.trim());
  const newState = parts.length >= 2 ? parts[parts.length - 2] : null;
  
  if (newState && !currentStates.includes(newState)) {
    currentStates.push(newState);
  }

  // Use a transaction to ensure both updates succeed
  return await prisma.$transaction(async (tx) => {
    await tx.sighting.update({
      where: { id: sighting.id },
      data: { incidentId: incident.id }
    });

    return await tx.incident.update({
      where: { id: incident.id },
      data: {
        minLat: Math.min(incident.minLat, sighting.latitude!),
        maxLat: Math.max(incident.maxLat, sighting.latitude!),
        minLng: Math.min(incident.minLng, sighting.longitude!),
        maxLng: Math.max(incident.maxLng, sighting.longitude!),
        lastSeen: sighting.date > incident.lastSeen ? sighting.date : incident.lastSeen,
        sightingCount: incident.sightingCount + 1,
        statesCovered: JSON.stringify(currentStates),
        status: IncidentStatus.OPEN,
        closedAt: null
      }
    });
  });
}

/**
 * Checks all OPEN and CLOSED incidents and updates their status based on inactivity.
 * - OPEN -> CLOSED: No new sightings for 5 days.
 * - CLOSED -> PERMANENTLY_CLOSED: No new sightings for 4 months since closedAt.
 */
export async function closeInactiveIncidents(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const fourMonthsAgo = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);

  const openIncidents = await prisma.incident.findMany({
    where: { status: IncidentStatus.OPEN }
  });

  for (const incident of openIncidents) {
    if (incident.lastSeen < fiveDaysAgo) {
      await prisma.incident.update({
        where: { id: incident.id },
        data: {
          status: IncidentStatus.CLOSED,
          closedAt: now
        }
      });
    }
  }

  const closedIncidents = await prisma.incident.findMany({
    where: { status: IncidentStatus.CLOSED }
  });

  for (const incident of closedIncidents) {
    if (incident.closedAt && incident.closedAt < fourMonthsAgo) {
      await prisma.incident.update({
        where: { id: incident.id },
        data: {
          status: IncidentStatus.PERMANENTLY_CLOSED
        }
      });
    }
  }
}
