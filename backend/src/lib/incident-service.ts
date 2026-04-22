import { PrismaClient, IncidentStatus } from '@prisma/client';
import type { Incident, Sighting } from '@prisma/client';
import { calculateDistance } from './geo-utils.js';

/**
 * Normalizes a scientific name by stripping parenthetical qualifiers and trimming whitespace.
 * If the resulting name is only one word, it fallbacks to the common name if provided.
 * Example: "Lonchura malacca (Exotic: Naturalized)" -> "Lonchura malacca"
 */
export function normalizeScientificName(raw: string, commonName?: string): string {
  if (!raw) return commonName || '';

  // 1. Try to find a valid binomial (Genus species) within the string.
  // This helps with mangled names like "Mexican) (Setophaga petechia [castaneiceps Group]"
  const binomialMatch = raw.match(/([A-Z][a-z]+ [a-z]+)/);
  if (binomialMatch) {
    return binomialMatch[1];
  }

  // 2. Fallback to the old method of cleaning parentheses
  const cleaned = raw.replace(/\s*\(.*$/g, '').replace(/[()]/g, '').trim();
  
  // Valid scientific names for species are binomial (at least 2 words).
  // If we only have one word, it's likely a miscaptured subspecies or status.
  if (!cleaned.includes(' ') && commonName) {
    return commonName;
  }
  
  return cleaned;
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
  const normScientific = normalizeScientificName(sighting.scientificName || '', sighting.species);
  
  // Extract location components if possible (format: "Location, County, State, Country")
  const parts = sighting.location.split(',').map(p => p.trim());
  const primaryCounty = parts.length >= 2 ? parts[parts.length - 3] : null;
  const primaryState = parts.length >= 2 ? parts[parts.length - 2] : null;
  const primaryCountry = parts.length >= 1 ? parts[parts.length - 1] : null;
  const statesCovered = primaryState ? [primaryState] : [];

  const incident = await prisma.incident.create({
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
      statesCovered: JSON.stringify(statesCovered)
    }
  });

  await prisma.sighting.update({
    where: { id: sighting.id },
    data: { incidentId: incident.id }
  });

  return incident;
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
        firstSeen: sighting.date < incident.firstSeen ? sighting.date : incident.firstSeen,
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
 * - OPEN -> CLOSED: No new sightings for 3 days.
 * - CLOSED -> PERMANENTLY_CLOSED: No new sightings for 4 months since closedAt.
 */
export async function closeInactiveIncidents(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const fourMonthsAgo = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);

  const openIncidents = await prisma.incident.findMany({
    where: { status: IncidentStatus.OPEN }
  });

  for (const incident of openIncidents) {
    if (incident.lastSeen < threeDaysAgo) {
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

/**
 * Formats a date as YYYY-MM-DD using local time components.
 * This ensures the calendar date is preserved regardless of timezone shifts.
 */
export function formatDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Fetches all OPEN incidents enriched with rarity data and summary fields.
 */
export async function getOpenIncidents(prisma: PrismaClient) {
  const incidents = await prisma.incident.findMany({
    where: { status: IncidentStatus.OPEN },
    include: {
      sightings: {
        orderBy: { date: 'desc' }
      }
    }
  });

  const rarityCodes = await prisma.rarityCode.findMany();
  
  // Create a map for faster lookup by scientific name (normalized)
  const rarityMap = new Map<string, number>();
  rarityCodes.forEach(r => {
    if (r.scientificName) {
      rarityMap.set(normalizeScientificName(r.scientificName), r.abaCode);
    }
    // Also map by common name as a fallback if needed, but scientific is primary
    if (r.commonName) {
      rarityMap.set(r.commonName, r.abaCode);
    }
  });

  const now = new Date();
  const todayStr = formatDate(now);
  const todayBasis = new Date(`${todayStr}T12:00:00`); // Use noon to avoid DST/timezone edge issues when subtracting days

  return incidents.map(incident => {
    const latestSighting = incident.sightings[0];
    const abaCode = rarityMap.get(normalizeScientificName(incident.scientificName)) || null;

    // activeDays is difference between firstSeen and lastSeen dates inclusive
    const firstSeenStr = formatDate(incident.firstSeen);
    const lastSeenStr = formatDate(incident.lastSeen);
    const firstDate = new Date(firstSeenStr);
    const lastDate = new Date(lastSeenStr);
    const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
    const activeDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Calculate dailyCounts for the past 21 days ending today
    const dailyCounts: { date: string; count: number }[] = [];
    const sightingsByDate: Record<string, number> = {};
    
    incident.sightings.forEach(s => {
      const dateStr = formatDate(s.date);
      sightingsByDate[dateStr] = (sightingsByDate[dateStr] || 0) + 1;
    });

    for (let i = 20; i >= 0; i--) {
      const d = new Date(todayBasis);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      dailyCounts.push({
        date: dateStr,
        count: sightingsByDate[dateStr] || 0
      });
    }

    return {
      ...incident,
      scientificName: normalizeScientificName(incident.scientificName, incident.commonName),
      abaCode,
      centroidLat: (incident.minLat + incident.maxLat) / 2,
      centroidLng: (incident.minLng + incident.maxLng) / 2,
      locationName: `${incident.primaryState}, ${incident.primaryCountry}`,
      latestMapUrl: latestSighting?.mapUrl || null,
      latestChecklistUrl: latestSighting?.checklistUrl || null,
      activeDays,
      dailyCounts,
      firstSeen: firstSeenStr,
      lastSeen: lastSeenStr,
      sightings: incident.sightings.map(s => ({
        ...s,
        date: formatDate(s.date)
      }))
    };
  });
}
