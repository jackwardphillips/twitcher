import { MatchEngine } from './match-engine.js';
import { prisma } from './db.js';
import { RegionService } from './region-service.js';
import type { Sighting } from '@prisma/client';

export class EnrichmentService {
  private static readonly STATE_MAPPINGS: Record<string, string> = {
    'Maine': 'US-ME', 'ME': 'US-ME',
    'New York': 'US-NY', 'NY': 'US-NY',
    'Pennsylvania': 'US-PA', 'PA': 'US-PA',
    'Florida': 'US-FL', 'FL': 'US-FL',
    'Texas': 'US-TX', 'TX': 'US-TX',
    'California': 'US-CA', 'CA': 'US-CA',
    'British Columbia': 'CA-BC', 'BC': 'CA-BC',
    'Quebec': 'CA-QC', 'QC': 'CA-QC',
    'Ontario': 'CA-ON', 'ON': 'CA-ON',
    'Massachusetts': 'US-MA', 'MA': 'US-MA',
    'Vermont': 'US-VT', 'VT': 'US-VT',
    'Newfoundland and Labrador': 'CA-NL', 'Newfoundland': 'CA-NL', 'NL': 'CA-NL',
    'Nebraska': 'US-NE', 'NE': 'US-NE',
    'Hawaii': 'US-HI', 'HI': 'US-HI',
    'Arizona': 'US-AZ', 'AZ': 'US-AZ',
    'Alaska': 'US-AK', 'AK': 'US-AK',
    'Yukon': 'CA-YT', 'YT': 'CA-YT',
    'Oregon': 'US-OR', 'OR': 'US-OR',
    'Washington': 'US-WA', 'WA': 'US-WA',
    'New Jersey': 'US-NJ', 'NJ': 'US-NJ',
  };

  constructor(
    private matchEngine: MatchEngine,
    private regionService: RegionService
  ) {}

  async enrichSighting(sightingId: number): Promise<void> {
    const sighting = await prisma.sighting.findUnique({
      where: { id: sightingId },
    });

    if (!sighting) return;
    if (sighting.subId) return; // Already enriched

    const match = await this.matchEngine.findMatch(sighting);

    if (match) {
      await this.applyMatch(sightingId, match);
    }
  }

  async enrichAllUnenriched(): Promise<void> {
    const unenriched = await prisma.sighting.findMany({
      where: {
        subId: null,
      },
    });

    if (unenriched.length === 0) return;

    // 1. Separate sightings with and without coordinates
    const withCoords: Sighting[] = [];
    const withoutCoords: Sighting[] = [];

    for (const sighting of unenriched) {
      if (sighting.location.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)) {
        withCoords.push(sighting);
      } else {
        withoutCoords.push(sighting);
      }
    }

    // 2. Process geo-searches for sightings with coordinates (caching by lat/lng)
    const geoCache = new Map<string, any[]>();
    const failedGeoSearch: Sighting[] = [];

    for (const sighting of withCoords) {
      const coords = sighting.location.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (coords) {
        const key = `${coords[1]},${coords[2]}`;
        if (!geoCache.has(key)) {
          const observations = await this.matchEngine.ebirdClient.getNearbyNotableObservations(
            parseFloat(coords[1]!), parseFloat(coords[2]!), 10, 30
          );
          geoCache.set(key, observations);
        }
        
        const match = this.matchEngine.selectBestMatch(geoCache.get(key)!, sighting.species, sighting.location, sighting.date);
        if (match) {
          await this.applyMatch(sighting.id, match);
        } else {
          // Fallback: If geo-search fails, add to the regional pool
          failedGeoSearch.push(sighting);
        }
      }
    }

    // 3. Group remaining sightings by extracted region code (Surgical County > State)
    const regionalPool = [...withoutCoords, ...failedGeoSearch];
    const regionGroups = new Map<string, Sighting[]>();
    
    for (const sighting of regionalPool) {
      const regionCode = await this.extractDetailedRegionCode(sighting.location);
      if (regionCode) {
        if (!regionGroups.has(regionCode)) regionGroups.set(regionCode, []);
        regionGroups.get(regionCode)!.push(sighting);
      }
    }

    // 4. Process each region group with a single API call
    for (const [regionCode, sightings] of regionGroups.entries()) {
      console.log(`Fetching notable observations for region: ${regionCode}...`);
      const observations = await this.matchEngine.ebirdClient.getNotableObservations(regionCode, 30);
      console.log(`Found ${observations.length} notable observations in ${regionCode}. Matching ${sightings.length} sightings...`);
      for (const sighting of sightings) {
        const match = this.matchEngine.selectBestMatch(observations, sighting.species, sighting.location, sighting.date);
        if (match) await this.applyMatch(sighting.id, match);
      }
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  private async extractDetailedRegionCode(location: string): Promise<string | null> {
    const parts = location.split(',').map(p => p.trim());
    
    // Pattern: [Hotspot], [County], [State], [Country]
    // We look for State first to narrow down the search
    let subnational1Code: string | null = null;
    let countyName: string | null = null;

    // Check from the end of parts
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i]!;
      const stateCode = this.getStateCode(part);
      if (stateCode) {
        subnational1Code = stateCode;
        // The part before the state is usually the county
        if (i > 0) {
            countyName = parts[i-1]!;
        }
        break;
      }
    }

    if (!subnational1Code) return null;

    // If we have a county, try to get the surgical subnational2 code
    if (countyName) {
      const subnational2Code = await this.regionService.findSubregionCode(countyName, subnational1Code);
      if (subnational2Code) return subnational2Code;
    }

    // Fallback to subnational1 (State)
    return subnational1Code;
  }

  private getStateCode(part: string): string | null {
    // Exact match or contains state name
    if (EnrichmentService.STATE_MAPPINGS[part]) return EnrichmentService.STATE_MAPPINGS[part]!;
    for (const [name, code] of Object.entries(EnrichmentService.STATE_MAPPINGS)) {
      if (part.includes(name)) return code;
    }

    // Check for strict code format XX-YY
    const strict = part.match(/\b([A-Z]{2}-[A-Z]{2,3})\b/);
    if (strict) return strict[1]!;

    return null;
  }

  private async applyMatch(sightingId: number, match: any): Promise<void> {
    await prisma.sighting.update({
      where: { id: sightingId },
      data: {
        latitude: match.lat,
        longitude: match.lng,
        subId: match.subId,
        locId: match.locId,
        speciesCode: match.speciesCode,
        howMany: match.howMany,
      },
    });
  }
}
