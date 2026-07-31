import { PrismaClient, IncidentStatus } from '@prisma/client';
import type { Incident, Sighting } from '@prisma/client';
import { calculateDistance } from './geo-utils.js';

const REGION_NAMES = new Set([
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
  'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
  'Saskatchewan', 'Yukon', 'Midway Islands',
]);

function isCoordinatePart(part: string): boolean {
  return /[-+]?\d{1,3}\.\d+/.test(part) || /\b[A-Z]{2}-[A-Z]{2}\b/.test(part);
}

export function extractLocationComponents(location: string): { county: string | null; state: string | null; country: string | null } {
  const parts = location.split(',')
    .map(p => p.trim())
    .filter(part => part && !isCoordinatePart(part));

  if (parts.length >= 3 && REGION_NAMES.has(parts[parts.length - 1]!)) {
    return {
      county: parts[parts.length - 2] ?? null,
      state: parts[parts.length - 1] ?? null,
      country: null,
    };
  }

  if (parts.length >= 4) {
    return {
      county: parts[parts.length - 3] ?? null,
      state: parts[parts.length - 2] ?? null,
      country: parts[parts.length - 1] ?? null,
    };
  }

  if (parts.length === 3) {
    return {
      county: parts[1] ?? null,
      state: parts[2] ?? null,
      country: null,
    };
  }

  if (parts.length === 2) {
    if (REGION_NAMES.has(parts[0]!)) {
      return {
        county: null,
        state: parts[0] ?? null,
        country: parts[1] ?? null,
      };
    }

    if (!REGION_NAMES.has(parts[1]!)) {
      return {
        county: parts[1] ?? null,
        state: null,
        country: null,
      };
    }

    return {
      county: null,
      state: parts[1] ?? null,
      country: null,
    };
  }

  return {
    county: null,
    state: null,
    country: parts[0] ?? null,
  };
}

function getSightingLocationComponents(sighting: Sighting): { county: string | null; state: string | null; country: string | null } {
  if (sighting.displayCounty || sighting.displayState || sighting.displayCountry) {
    return {
      county: sighting.displayCounty ?? null,
      state: sighting.displayState ?? null,
      country: sighting.displayCountry ?? null,
    };
  }

  return extractLocationComponents(sighting.location);
}

function formatIncidentLocation(
  incident: Incident,
  latestSighting?: Pick<Sighting, 'displayCounty' | 'displayState'>,
): string {
  if (latestSighting?.displayCounty && latestSighting.displayState) {
    return `${formatCountyName(latestSighting.displayCounty)}, ${latestSighting.displayState}`;
  }
  if (incident.primaryCounty && incident.primaryState) {
    return `${formatCountyName(incident.primaryCounty)}, ${incident.primaryState}`;
  }
  if (incident.primaryState && incident.primaryCountry) {
    return `${incident.primaryState}, ${incident.primaryCountry}`;
  }
  return incident.primaryState ?? incident.primaryCountry ?? 'Unknown location';
}

function formatCountyName(county: string): string {
  return county.replace(/\s+County$/i, '').trim();
}

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
  if (binomialMatch && binomialMatch[1]) {
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
 * Finds all matching OPEN or CLOSED incidents for a given scientific name, coordinates, and date.
 * An incident matches if it has the same scientific name and at least one sighting 
 * within the velocity-aware radius of the provided coordinates.
 * Velocity-aware radius: 25km + (timeDiffHours * 50km), capped at 200km, if within 24h of lastSeen.
 * Default radius is 25km.
 */
export async function findMatchingIncident(
  prisma: PrismaClient,
  scientificName: string,
  latitude: number,
  longitude: number,
  date: Date
): Promise<Incident[]> {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return [];
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
    return [];
  }

  // Filter candidates by proximity
  const matchingCandidates = candidates.filter(incident => {
    // Compute the matching radius using lastSeen
    const timeDiffHours = Math.abs(date.getTime() - incident.lastSeen.getTime()) / (1000 * 60 * 60);
    
    let radius = 25;
    if (timeDiffHours <= 24) {
      radius = Math.min(25 + (timeDiffHours * 10), 50);
    }

    return incident.sightings.some(sighting => {
      if (sighting.latitude === null || sighting.longitude === null) return false;
      const dist = calculateDistance(latitude, longitude, sighting.latitude, sighting.longitude);
      return dist <= radius;
    });
  });

  // Prioritize OPEN over CLOSED
  matchingCandidates.sort((a, b) => {
    if (a.status === IncidentStatus.OPEN && b.status !== IncidentStatus.OPEN) return -1;
    if (a.status !== IncidentStatus.OPEN && b.status === IncidentStatus.OPEN) return 1;
    return 0;
  });

  return matchingCandidates;
}

/**
 * Creates a new incident based on an initial sighting.
 */
export async function createIncident(
  prisma: PrismaClient,
  sighting: Sighting,
  pollRegion?: { name: string; code: string },
): Promise<Incident> {
  const normScientific = normalizeScientificName(sighting.scientificName || '', sighting.species);
  
  const location = getSightingLocationComponents(sighting);
  const primaryCounty = location.county;
  const primaryState = location.state;
  const primaryCountry = location.country;
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
      primaryCounty: primaryCounty ?? null,
      primaryState: primaryState ?? null,
      primaryCountry: primaryCountry ?? null,
      pollRegionName: pollRegion?.name ?? null,
      pollRegionCode: pollRegion?.code ?? null,
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
 * Merges multiple incidents into one.
 * The "survivor" is the incident with the earliest createdAt date.
 * All sightings from other incidents are reassigned to the survivor.
 * The survivor's metadata is updated to reflect the combined bounds and dates.
 */
export async function mergeIncidents(
  prisma: PrismaClient,
  incidentIds: string[]
): Promise<Incident> {
  if (incidentIds.length === 0) throw new Error('No incident IDs provided for merge');
  
  return await prisma.$transaction(async (tx) => {
    // Find all incidents to be merged INSIDE transaction
    const incidents = await tx.incident.findMany({
      where: { id: { in: incidentIds } },
      include: { sightings: true },
      orderBy: { createdAt: 'asc' }
    });

    if (incidents.length === 0) throw new Error('No incidents found for merge');
    if (incidents.length === 1) return incidents[0]!;

    const survivor = incidents[0]!;
    const toMerge = incidents.slice(1);

    // Collect all sightings
    const allSightings = incidents.flatMap(inc => inc.sightings);
    
    // Recompute metadata
    const validCoords = allSightings.filter(s => s.latitude !== null && s.longitude !== null);
    const minLat = Math.min(...validCoords.map(s => s.latitude!));
    const maxLat = Math.max(...validCoords.map(s => s.latitude!));
    const minLng = Math.min(...validCoords.map(s => s.longitude!));
    const maxLng = Math.max(...validCoords.map(s => s.longitude!));
    const firstSeen = new Date(Math.min(...allSightings.map(s => s.date.getTime())));
    const lastSeen = new Date(Math.max(...allSightings.map(s => s.date.getTime())));
    
    const allStates = new Set<string>();
    allSightings.forEach(s => {
      const location = getSightingLocationComponents(s);
      if (location.state) allStates.add(location.state);
    });

    // 1. Reassign sightings
    await tx.sighting.updateMany({
      where: { incidentId: { in: toMerge.map(inc => inc.id) } },
      data: { incidentId: survivor.id }
    });

    // 2. Update survivor
    const updatedSurvivor = await tx.incident.update({
      where: { id: survivor.id },
      data: {
        minLat,
        maxLat,
        minLng,
        maxLng,
        firstSeen,
        lastSeen,
        sightingCount: allSightings.length,
        statesCovered: JSON.stringify(Array.from(allStates)),
        status: IncidentStatus.OPEN,
        closedAt: null
      }
    });

    // 3. Delete merged incidents
    await tx.incident.deleteMany({
      where: { id: { in: toMerge.map(inc => inc.id) } }
    });

    return updatedSurvivor;
  });
}

/**
 * Adds a sighting to an existing incident (or merges multiple incidents and adds to the result).
 */
export async function addSightingToIncident(
  prisma: PrismaClient,
  incidentOrIncidents: Incident | Incident[],
  sighting: Sighting,
  pollRegion?: { name: string; code: string },
): Promise<Incident> {
  let incidentId: string;
  
  if (Array.isArray(incidentOrIncidents)) {
    if (incidentOrIncidents.length === 0) {
      throw new Error('No incidents provided to addSightingToIncident');
    }
    if (incidentOrIncidents.length > 1) {
      const merged = await mergeIncidents(prisma, incidentOrIncidents.map(inc => inc.id));
      incidentId = merged.id;
    } else {
      incidentId = incidentOrIncidents[0]!.id;
    }
  } else {
    incidentId = incidentOrIncidents.id;
  }

  const updateIncident = () => prisma.$transaction(async (tx) => {
    // Fetch the latest incident state to avoid race conditions with stale data
    const latestIncident = await tx.incident.findUnique({
      where: { id: incidentId }
    });

    if (!latestIncident) {
      throw new Error(`Incident ${incidentId} not found during update`);
    }

    if (latestIncident.status === IncidentStatus.PERMANENTLY_CLOSED) {
      throw new Error('Cannot add sighting to PERMANENTLY_CLOSED incident');
    }

    const currentStates: string[] = JSON.parse(latestIncident.statesCovered);
    const location = getSightingLocationComponents(sighting);
    const newState = location.state;
    
    if (newState && !currentStates.includes(newState)) {
      currentStates.push(newState);
    }

    await tx.sighting.update({
      where: { id: sighting.id },
      data: { incidentId: latestIncident.id }
    });

    return await tx.incident.update({
      where: { id: latestIncident.id },
      data: {
        minLat: Math.min(latestIncident.minLat, sighting.latitude!),
        maxLat: Math.max(latestIncident.maxLat, sighting.latitude!),
        minLng: Math.min(latestIncident.minLng, sighting.longitude!),
        maxLng: Math.max(latestIncident.maxLng, sighting.longitude!),
        firstSeen: sighting.date < latestIncident.firstSeen ? sighting.date : latestIncident.firstSeen,
        lastSeen: sighting.date > latestIncident.lastSeen ? sighting.date : latestIncident.lastSeen,
        sightingCount: { increment: 1 },
        statesCovered: JSON.stringify(currentStates),
        status: IncidentStatus.OPEN,
        closedAt: null,
        ...(pollRegion ? {
          pollRegionName: pollRegion.name,
          pollRegionCode: pollRegion.code,
        } : {}),
      }
    });
  }, { isolationLevel: 'Serializable' });

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await updateIncident();
    } catch (error) {
      const isSerializationConflict = error instanceof Error &&
        'code' in error && error.code === 'P2034';
      if (!isSerializationConflict || attempt === 3) throw error;
    }
  }

  throw new Error(`Incident ${incidentId} could not be updated after serialization retries`);
}

export async function reopenClosedIncident(
  prisma: PrismaClient,
  incidentId: string,
  pollRegion: { name: string; code: string },
): Promise<boolean> {
  const result = await prisma.incident.updateMany({
    where: {
      id: incidentId,
      status: IncidentStatus.CLOSED,
    },
    data: {
      status: IncidentStatus.OPEN,
      closedAt: null,
      pollRegionName: pollRegion.name,
      pollRegionCode: pollRegion.code,
    },
  });
  return result.count === 1;
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
      await prisma.incident.updateMany({
        where: {
          id: incident.id,
          status: IncidentStatus.OPEN,
          lastSeen: { lt: threeDaysAgo },
        },
        data: {
          status: IncidentStatus.CLOSED,
          closedAt: now,
        },
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
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const incidents = await prisma.incident.findMany({
    where: {
      status: IncidentStatus.OPEN,
      lastSeen: { gte: threeDaysAgo },
      sightings: {
        some: { status: 'present' },
      },
    },
    include: {
      sightings: {
        where: { status: 'present' },
        orderBy: { date: 'desc' }
      }
    }
  });

  const rarityCodes = await prisma.rarityCode.findMany();
  const speciesPhotos = await prisma.speciesPhoto.findMany();
  
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

  const photoMap = new Map<string, { url: string | null; attribution: string | null; sourceUrl: string | null }>();
  speciesPhotos.forEach(p => {
    photoMap.set(p.speciesName, { url: p.photoUrl, attribution: p.attribution, sourceUrl: p.sourceUrl });
  });

  const now = new Date();
  const todayStr = formatDate(now);
  const todayBasis = new Date(`${todayStr}T12:00:00`); // Use noon to avoid DST/timezone edge issues when subtracting days

  return incidents.map(incident => {
    const latestSighting = incident.sightings[0];
    const normSciName = normalizeScientificName(incident.scientificName, incident.commonName);
    const abaCode = rarityMap.get(normalizeScientificName(incident.scientificName)) || null;
    const photoData = photoMap.get(normSciName);
    const photo = photoData?.url && photoData.sourceUrl
      ? { url: photoData.url, attribution: photoData.attribution, sourceUrl: photoData.sourceUrl }
      : null;

    // Fix: Derive bounds directly from sightings to fix legacy corrupted data
    const sightingDates = incident.sightings.map(s => s.date.getTime());
    const firstSeenDate = sightingDates.length > 0 ? new Date(Math.min(...sightingDates)) : incident.firstSeen;
    const lastSeenDate = sightingDates.length > 0 ? new Date(Math.max(...sightingDates)) : incident.lastSeen;

    const firstSeenStr = formatDate(firstSeenDate);
    const lastSeenStr = formatDate(lastSeenDate);
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
      scientificName: normSciName,
      abaCode,
      photo,
      centroidLat: (incident.minLat + incident.maxLat) / 2,
      centroidLng: (incident.minLng + incident.maxLng) / 2,
      locationName: formatIncidentLocation(incident, latestSighting),
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
