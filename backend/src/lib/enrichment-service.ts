import { MatchEngine } from './match-engine.js';
import { prisma } from './db.js';
import type { Sighting } from '@prisma/client';

export class EnrichmentService {
  constructor(private matchEngine: MatchEngine) {}

  async enrichSighting(sightingId: number): Promise<void> {
    const sighting = await prisma.sighting.findUnique({
      where: { id: sightingId },
    });

    if (!sighting) return;
    if (sighting.subId) return; // Already enriched

    const match = await this.matchEngine.findMatch(sighting);

    if (match) {
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

    // 3. Group remaining sightings by extracted region code
    // (Both sightings without coords AND those that failed their geo-search)
    const regionalPool = [...withoutCoords, ...failedGeoSearch];
    const regionGroups = new Map<string, Sighting[]>();
    for (const sighting of regionalPool) {
      const regionCode = this.extractRegionCode(sighting.location);
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

  private extractRegionCode(location: string): string | null {
    // 1. Explicit state/province mappings (Highest priority)
    const stateMappings: Record<string, string> = {
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
    };

    for (const [name, code] of Object.entries(stateMappings)) {
      if (location.includes(name)) return code;
    }

    // 2. Strict Region Code format: XX-YY or XX-YY-ZZ (e.g., US-NY, CA-BC)
    const strictRegionMatch = location.match(/\b([A-Z]{2}-[A-Z]{2,3}(?:-[A-Z]{2,3})?)\b/);
    if (strictRegionMatch) return strictRegionMatch[1]!;

    // 3. Known country codes or specific state abbreviations (Low priority, must be at boundaries)
    // We avoid generic 2-letter codes like 'ME', 'SW', 'SP' which are often noise
    const countryMatch = location.match(/\b(US|CA|MX|GB)\b/);
    if (countryMatch) return countryMatch[1]!;

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
