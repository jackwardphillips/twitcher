import 'dotenv/config';
import { prisma } from '../lib/db.js';
import { LocationResolver } from '../lib/location-resolver.js';

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

function getNumberArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const arg = process.argv.find(value => value.startsWith(prefix));
  if (!arg) return fallback;
  const value = Number(arg.slice(prefix.length));
  return Number.isFinite(value) ? value : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function needsLocationRepair(incident: { primaryCounty: string | null; primaryState: string | null; primaryCountry: string | null }): boolean {
  if (!incident.primaryState) return true;
  if (!REGION_NAMES.has(incident.primaryState)) return true;
  if (incident.primaryCounty && /[-+]?\d{1,3}\.\d+/.test(incident.primaryCounty)) return true;
  if (incident.primaryCounty && /--|\(|\d/.test(incident.primaryCounty)) return true;
  return false;
}

function cleanCountyName(county: string | null): string | null {
  return county?.replace(/\s+County$/i, '').trim() || null;
}

function countyFromExistingFields(incident: { primaryState: string | null }): string | null {
  if (!incident.primaryState || REGION_NAMES.has(incident.primaryState)) return null;
  if (/--|\(|\d|NWR|restricted access/i.test(incident.primaryState)) return null;
  return incident.primaryState;
}

function applySpecialRegionFallback(text: string, resolved: { county: string | null; state: string | null; country: string | null }) {
  if (/Midway/i.test(text) && !resolved.state) {
    return {
      county: null,
      state: 'Midway Islands',
      country: 'UM',
    };
  }

  return resolved;
}

function coordinateRegionFallback(lat: number, lng: number): string | null {
  if (lat >= 50 && lng <= -130 && lng >= -180) return 'Alaska';
  if (lat >= 32 && lat <= 43 && lng >= -125 && lng <= -114) return 'California';
  if (lat >= 18 && lat <= 23 && lng >= -161 && lng <= -154) return 'Hawaii';
  return null;
}

async function main() {
  const limit = getNumberArg('limit', 50);
  const write = hasFlag('write');
  const resolver = new LocationResolver(async () => null);

  const incidents = await prisma.incident.findMany({
    where: {
      status: 'OPEN',
      sightings: {
        some: {
          status: 'present',
          latitude: { not: null },
          longitude: { not: null },
        },
      },
    },
    include: {
      sightings: {
        where: {
          status: 'present',
          latitude: { not: null },
          longitude: { not: null },
        },
        orderBy: { date: 'desc' },
      },
    },
  });

  const candidates = incidents
    .filter(needsLocationRepair)
    .slice(0, limit);

  let repaired = 0;
  let unresolved = 0;

  for (const incident of candidates) {
    const sighting = incident.sightings[0];
    if (!sighting || sighting.latitude === null || sighting.longitude === null) {
      unresolved++;
      continue;
    }

    const resolved = await resolver.resolve({
      speciesCode: sighting.speciesCode ?? '',
      comName: sighting.species,
      sciName: sighting.scientificName ?? '',
      locId: sighting.locId ?? '',
      locName: sighting.location,
      obsDt: sighting.date.toISOString(),
      howMany: sighting.howMany ?? undefined,
      lat: sighting.latitude,
      lng: sighting.longitude,
      obsValid: true,
      obsReviewed: false,
      locationPrivate: false,
      subId: sighting.subId ?? String(sighting.id),
    });

    const fallbackApplied = applySpecialRegionFallback(`${incident.primaryCounty ?? ''} ${incident.primaryState ?? ''} ${sighting.location}`, resolved);
    const county = countyFromExistingFields(incident) ?? cleanCountyName(fallbackApplied.county);
    const state = fallbackApplied.state ?? coordinateRegionFallback(sighting.latitude, sighting.longitude);
    const country = fallbackApplied.country;

    if (!state && !county && !country) {
      unresolved++;
      continue;
    }

    console.log(`${incident.commonName}: ${incident.primaryCounty ?? 'null'}, ${incident.primaryState ?? 'null'} -> ${county ?? 'null'}, ${state ?? 'null'} (${resolved.source})`);

    if (write) {
      await prisma.sighting.update({
        where: { id: sighting.id },
        data: {
          displayCounty: county,
          displayState: state,
          displayCountry: country,
          locationResolutionSource: resolved.source,
        },
      });
      await prisma.incident.update({
        where: { id: incident.id },
        data: {
          primaryCounty: county,
          primaryState: state,
          primaryCountry: country,
          statesCovered: JSON.stringify(state ? [state] : []),
        },
      });
    }

    repaired++;
  }

  console.log(JSON.stringify({
    mode: write ? 'write' : 'dry-run',
    openIncidents: incidents.length,
    candidates: candidates.length,
    repaired,
    unresolved,
  }, null, 2));
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
