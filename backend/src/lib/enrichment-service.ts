import { MatchEngine } from './match-engine.js';
import { prisma } from './db.js';
import { RegionService } from './region-service.js';
import { findMatchingIncident, createIncident, addSightingToIncident, normalizeScientificName } from './incident-service.js';
import type { Sighting } from '@prisma/client';
import type { EbirdObservation } from './ebird-client.js';
import type { EnrichmentLoggingContext, MatchDiagnostics } from './enrichment-logging.js';
import { createEnrichmentAttempt, finishEnrichmentAttempt, sanitizeLogError } from './enrichment-logging.js';

export class EnrichmentService {
  private static readonly STATE_MAPPINGS: Record<string, string> = {
    'Alabama': 'US-AL', 'AL': 'US-AL',
    'Alaska': 'US-AK', 'AK': 'US-AK',
    'Arizona': 'US-AZ', 'AZ': 'US-AZ',
    'Arkansas': 'US-AR', 'AR': 'US-AR',
    'California': 'US-CA', 'CA': 'US-CA',
    'Colorado': 'US-CO', 'CO': 'US-CO',
    'Connecticut': 'US-CT', 'CT': 'US-CT',
    'Delaware': 'US-DE', 'DE': 'US-DE',
    'District of Columbia': 'US-DC', 'Washington DC': 'US-DC', 'DC': 'US-DC',
    'Florida': 'US-FL', 'FL': 'US-FL',
    'Georgia': 'US-GA', 'GA': 'US-GA',
    'Hawaii': 'US-HI', 'HI': 'US-HI',
    'Idaho': 'US-ID', 'ID': 'US-ID',
    'Illinois': 'US-IL', 'IL': 'US-IL',
    'Indiana': 'US-IN', 'IN': 'US-IN',
    'Iowa': 'US-IA', 'IA': 'US-IA',
    'Kansas': 'US-KS', 'KS': 'US-KS',
    'Kentucky': 'US-KY', 'KY': 'US-KY',
    'Louisiana': 'US-LA', 'LA': 'US-LA',
    'Maine': 'US-ME', 'ME': 'US-ME',
    'Maryland': 'US-MD', 'MD': 'US-MD',
    'Massachusetts': 'US-MA', 'MA': 'US-MA',
    'Michigan': 'US-MI', 'MI': 'US-MI',
    'Minnesota': 'US-MN', 'MN': 'US-MN',
    'Mississippi': 'US-MS', 'MS': 'US-MS',
    'Missouri': 'US-MO', 'MO': 'US-MO',
    'Montana': 'US-MT', 'MT': 'US-MT',
    'Nebraska': 'US-NE', 'NE': 'US-NE',
    'Nevada': 'US-NV', 'NV': 'US-NV',
    'New Hampshire': 'US-NH', 'NH': 'US-NH',
    'New Jersey': 'US-NJ', 'NJ': 'US-NJ',
    'New Mexico': 'US-NM', 'NM': 'US-NM',
    'New York': 'US-NY', 'NY': 'US-NY',
    'North Carolina': 'US-NC', 'NC': 'US-NC',
    'North Dakota': 'US-ND', 'ND': 'US-ND',
    'Ohio': 'US-OH', 'OH': 'US-OH',
    'Oklahoma': 'US-OK', 'OK': 'US-OK',
    'Oregon': 'US-OR', 'OR': 'US-OR',
    'Pennsylvania': 'US-PA', 'PA': 'US-PA',
    'Rhode Island': 'US-RI', 'RI': 'US-RI',
    'South Carolina': 'US-SC', 'SC': 'US-SC',
    'South Dakota': 'US-SD', 'SD': 'US-SD',
    'Tennessee': 'US-TN', 'TN': 'US-TN',
    'Texas': 'US-TX', 'TX': 'US-TX',
    'Utah': 'US-UT', 'UT': 'US-UT',
    'Vermont': 'US-VT', 'VT': 'US-VT',
    'Virginia': 'US-VA', 'VA': 'US-VA',
    'Washington': 'US-WA', 'WA': 'US-WA',
    'West Virginia': 'US-WV', 'WV': 'US-WV',
    'Wisconsin': 'US-WI', 'WI': 'US-WI',
    'Wyoming': 'US-WY', 'WY': 'US-WY',

    'Alberta': 'CA-AB', 'AB': 'CA-AB',
    'British Columbia': 'CA-BC', 'BC': 'CA-BC',
    'Manitoba': 'CA-MB', 'MB': 'CA-MB',
    'New Brunswick': 'CA-NB', 'NB': 'CA-NB',
    'Newfoundland and Labrador': 'CA-NL', 'Newfoundland': 'CA-NL', 'Labrador': 'CA-NL', 'NL': 'CA-NL',
    'Northwest Territories': 'CA-NT', 'Northwest Territory': 'CA-NT', 'NWT': 'CA-NT', 'NT': 'CA-NT',
    'Nova Scotia': 'CA-NS', 'NS': 'CA-NS',
    'Nunavut': 'CA-NU', 'NU': 'CA-NU',
    'Ontario': 'CA-ON', 'ON': 'CA-ON',
    'Prince Edward Island': 'CA-PE', 'PEI': 'CA-PE', 'PE': 'CA-PE',
    'Quebec': 'CA-QC', 'QC': 'CA-QC',
    'Saskatchewan': 'CA-SK', 'SK': 'CA-SK',
    'Yukon': 'CA-YT', 'YT': 'CA-YT',

    'Midway Islands': 'UM-71', 'Midway Atoll': 'UM-71',
  };

  constructor(
    private matchEngine: MatchEngine,
    private regionService: RegionService
  ) {}

  /**
   * Enriches a single sighting by ID by finding a matching eBird observation.
   * 
   * @param sightingId The ID of the sighting to enrich.
   */
  async enrichSighting(sightingId: number, context?: EnrichmentLoggingContext): Promise<void> {
    const sighting = await prisma.sighting.findUnique({
      where: { id: sightingId },
    });

    if (!sighting) return;
    if (sighting.subId) return;

    await this.enrichSightings([sighting], context);
  }

  /**
   * Enriches all sightings that do not yet have an eBird subId.
   */
  async enrichAllUnenriched(context?: EnrichmentLoggingContext): Promise<void> {
    const unenriched = await prisma.sighting.findMany({
      where: { subId: null },
    });
    await this.enrichSightings(unenriched, context);
  }

  /**
   * Enriches a specific batch of sightings.
   * Uses a geo-cache for efficiency and handles individual request failures gracefully.
   * 
   * @param sightings The array of Sighting objects to enrich.
   */
  async enrichSightings(sightings: Sighting[], context?: EnrichmentLoggingContext): Promise<{ attempted: number; succeeded: number; failed: number }> {
    if (sightings.length === 0) return { attempted: 0, succeeded: 0, failed: 0 };

    type RegionalSighting = Sighting & { enrichmentAttemptId: string };
    let succeeded = 0;
    let failed = 0;
    const withCoords: Sighting[] = [];
    const withoutCoords: Sighting[] = [];

    for (const sighting of sightings) {
      if (this.getSightingCoordinates(sighting)) {
        withCoords.push(sighting);
      } else {
        withoutCoords.push(sighting);
      }
    }

    const geoCache = new Map<string, EbirdObservation[]>();
    const failedGeoSearch: Sighting[] = [];

    for (const sighting of withCoords) {
      const attempt = await createEnrichmentAttempt(context ?? {}, {
        sightingId: sighting.id,
        species: sighting.species,
        location: sighting.location,
        sightingDate: sighting.date,
      });
      const attemptContext = { ...context, enrichmentAttemptId: attempt.id };
      const coords = this.getSightingCoordinates(sighting);
      if (coords) {
        const key = `${coords.lat},${coords.lng}`;
        if (!geoCache.has(key)) {
          try {
            const observations = await this.matchEngine.ebirdClient.getNearbyNotableObservations(
              coords.lat, coords.lng, 10, 30, attemptContext
            );
            geoCache.set(key, observations);
          } catch (error) {
            console.error(`Failed to fetch nearby notable observations for ${key}:`, error instanceof Error ? error.message : error);
            geoCache.set(key, []); // Mark as empty to avoid retrying in this batch
            await finishEnrichmentAttempt(attempt.id, {
              status: 'error',
              strategy: 'geo_notable',
              regionCode: key,
              errorMessage: sanitizeLogError(error),
              diagnostics: {
                match: null,
                apiCandidateCount: 0,
                speciesMatchCount: 0,
                timeWindowMatchCount: 0,
                rejectionReason: 'api_error',
              },
            });
            failedGeoSearch.push(sighting);
            continue;
          }
        }

        const diagnostics = this.analyzeMatch(geoCache.get(key)!, sighting, coords);
        if (diagnostics.match) {
          await this.applyMatch(sighting.id, diagnostics.match);
          await finishEnrichmentAttempt(attempt.id, {
            status: 'matched',
            strategy: 'geo_notable',
            regionCode: key,
            diagnostics,
          });
          succeeded++;
        } else {
          await finishEnrichmentAttempt(attempt.id, {
            status: 'missed',
            strategy: 'geo_notable',
            regionCode: key,
            diagnostics,
          });
          failedGeoSearch.push(sighting);
        }
      }
    }

    const regionalPool = [...withoutCoords, ...failedGeoSearch];
    const regionGroups = new Map<string, RegionalSighting[]>();

    for (const sighting of regionalPool) {
      const attempt = await createEnrichmentAttempt(context ?? {}, {
        sightingId: sighting.id,
        species: sighting.species,
        location: sighting.location,
        sightingDate: sighting.date,
      });
      const attemptContext = { ...context, enrichmentAttemptId: attempt.id };
      const regionCode = await this.extractDetailedRegionCode(sighting.location, attemptContext);
      if (regionCode) {
        if (!regionGroups.has(regionCode)) regionGroups.set(regionCode, []);
        regionGroups.get(regionCode)!.push({ ...sighting, enrichmentAttemptId: attempt.id });
      } else {
        await finishEnrichmentAttempt(attempt.id, {
          status: 'missed',
          strategy: 'regional_notable',
          diagnostics: {
            match: null,
            apiCandidateCount: 0,
            speciesMatchCount: 0,
            timeWindowMatchCount: 0,
            rejectionReason: 'region_not_found',
          },
        });
        failed++; // Could not determine region
      }
    }

    for (const [regionCode, regionSightings] of regionGroups.entries()) {
      try {
        console.log(`Fetching notable observations for region: ${regionCode}...`);
        const observations = await this.matchEngine.ebirdClient.getNotableObservations(
          regionCode,
          30,
          context?.ingestionRunId ? { ingestionRunId: context.ingestionRunId } : undefined
        );
        console.log(`Found ${observations.length} notable observations in ${regionCode}. Matching ${regionSightings.length} sightings...`);
        for (const sighting of regionSightings) {
          const diagnostics = this.analyzeMatch(observations, sighting);
          if (diagnostics.match) {
            await this.applyMatch(sighting.id, diagnostics.match);
            await finishEnrichmentAttempt(sighting.enrichmentAttemptId, {
              status: 'matched',
              strategy: 'regional_notable',
              regionCode,
              diagnostics,
            });
            succeeded++;
          } else {
            await finishEnrichmentAttempt(sighting.enrichmentAttemptId, {
              status: 'missed',
              strategy: 'regional_notable',
              regionCode,
              diagnostics,
            });
            failed++;
          }
        }
      } catch (error) {
        console.error(`Failed to enrich sightings for region ${regionCode}:`, error instanceof Error ? error.message : error);
        for (const sighting of regionSightings) {
          await finishEnrichmentAttempt(sighting.enrichmentAttemptId, {
            status: 'error',
            strategy: 'regional_notable',
            regionCode,
            errorMessage: sanitizeLogError(error),
            diagnostics: {
              match: null,
              apiCandidateCount: 0,
              speciesMatchCount: 0,
              timeWindowMatchCount: 0,
              rejectionReason: 'api_error',
            },
          });
        }
        failed += regionSightings.length;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return { attempted: sightings.length, succeeded, failed };
  }

  private analyzeMatch(candidates: EbirdObservation[], sighting: Sighting, coords?: { lat: number; lng: number }): MatchDiagnostics {
    const analyzer = (this.matchEngine as MatchEngine & {
      analyzeBestMatch?: (candidates: EbirdObservation[], species: string, location: string, date: Date) => MatchDiagnostics;
    }).analyzeBestMatch;
    const locationForMatch = coords ? `${sighting.location} (${coords.lat},${coords.lng})` : sighting.location;

    if (typeof analyzer === 'function') {
      return analyzer.call(this.matchEngine, candidates, sighting.species, locationForMatch, sighting.date);
    }

    const match = this.matchEngine.selectBestMatch(candidates, sighting.species, locationForMatch, sighting.date);
    const fallback: MatchDiagnostics = {
      match,
      apiCandidateCount: candidates.length,
      speciesMatchCount: match ? 1 : 0,
      timeWindowMatchCount: match ? 1 : 0,
    };
    if (!match) {
      fallback.rejectionReason = candidates.length === 0 ? 'no_api_candidates' : 'no_best_match';
    }
    return fallback;
  }

  private getSightingCoordinates(sighting: Sighting): { lat: number; lng: number } | null {
    if (sighting.latitude !== null && sighting.longitude !== null) {
      return { lat: sighting.latitude, lng: sighting.longitude };
    }

    const coords = sighting.location.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (!coords) return null;

    return {
      lat: parseFloat(coords[1]!),
      lng: parseFloat(coords[2]!),
    };
  }

  private async extractDetailedRegionCode(location: string, context?: EnrichmentLoggingContext): Promise<string | null> {
    const parts = location.split(',').map(p => p.trim());

    let subnational1Code: string | null = null;
    let countyName: string | null = null;

    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i]!;
      const stateCode = EnrichmentService.getRegionCode(part);
      if (stateCode) {
        subnational1Code = stateCode;
        if (i > 0) {
          countyName = parts[i-1]!;
        }
        break;
      }
    }

    if (!subnational1Code) return null;

    if (countyName) {
      const subnational2Code = await this.regionService.findSubregionCode(countyName, subnational1Code, context);
      if (subnational2Code) return subnational2Code;
    }

    return subnational1Code;
  }

  static getRegionCode(part: string): string | null {
    if (EnrichmentService.STATE_MAPPINGS[part]) return EnrichmentService.STATE_MAPPINGS[part]!;
    const entries = Object.entries(EnrichmentService.STATE_MAPPINGS)
      .sort(([a], [b]) => b.length - a.length);
    const lowerPart = part.toLowerCase();

    for (const [name, code] of entries) {
      if (name.length <= 3) {
        const abbreviation = new RegExp(`\\b${name}\\b`);
        if (abbreviation.test(part)) return code;
      } else if (lowerPart.includes(name.toLowerCase())) {
        return code;
      }
    }

    const strict = part.match(/\b([A-Z]{2}-[A-Z]{2,3})\b/);
    if (strict) return strict[1]!;

    return null;
  }

  private async applyMatch(sightingId: number, match: EbirdObservation): Promise<void> {
    const sighting = await prisma.sighting.update({
      where: { id: sightingId },
      data: {
        latitude: match.lat,
        longitude: match.lng,
        subId: match.subId,
        locId: match.locId,
        speciesCode: match.speciesCode,
        howMany: match.howMany ?? null,
      },
    });

    // Clustering Logic - if not already clustered
    if (!sighting.incidentId && sighting.latitude !== null && sighting.longitude !== null) {
      const normScientific = normalizeScientificName(sighting.scientificName || '', sighting.species);
      const matchingIncidents = await findMatchingIncident(prisma, normScientific, sighting.latitude, sighting.longitude, sighting.date);
      
      if (matchingIncidents.length > 0) {
        await addSightingToIncident(prisma, matchingIncidents, sighting);
      } else {
        await createIncident(prisma, sighting);
      }
    }
  }
}
