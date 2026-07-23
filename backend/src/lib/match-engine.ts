import { EbirdClient } from './ebird-client.js';
import type { EbirdObservation } from './ebird-client.js';
import type { Sighting } from '@prisma/client';
import { calculateDistance } from './geo-utils.js';
import type { MatchDiagnostics } from './enrichment-logging.js';

export class MatchEngine {
  constructor(public ebirdClient: EbirdClient) {}

  async findMatch(sighting: Sighting): Promise<EbirdObservation | null> {
    const { species, location, date } = sighting;
    
    // 1. Try to parse coordinates from the location string
    const coords = this.parseCoordinates(location);
    
    let candidates: EbirdObservation[] = [];
    
    if (coords) {
      // If we have coordinates, search nearby (radius 10km, 30 days back)
      candidates = await this.ebirdClient.getNearbyNotableObservations(coords.lat, coords.lng, 10, 30);
    } else {
      // Try to extract a region code or state name
      const regionMatch = location.match(/\b([A-Z]{2}(?:-[A-Z]{2,3})?)\b/);
      if (regionMatch) {
        candidates = await this.ebirdClient.getNotableObservations(regionMatch[1]!, 30);
      }
    }

    if (candidates.length === 0) return null;

    // 2. Fuzzy match candidates
    return this.selectBestMatch(candidates, species, location, date);
  }

  public parseCoordinates(location: string): { lat: number; lng: number } | null {
    const regex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
    const match = location.match(regex);
    
    if (match && match[1] && match[2]) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
      };
    }
    return null;
  }

  public selectBestMatch(candidates: EbirdObservation[], targetSpecies: string, targetLocation: string, targetDate: Date): EbirdObservation | null {
    return this.analyzeBestMatch(candidates, targetSpecies, targetLocation, targetDate).match;
  }

  public analyzeBestMatch(candidates: EbirdObservation[], targetSpecies: string, targetLocation: string, targetDate: Date): MatchDiagnostics {
    const empty = {
      match: null,
      apiCandidateCount: candidates?.length ?? 0,
      speciesMatchCount: 0,
      timeWindowMatchCount: 0,
    };

    if (!candidates || candidates.length === 0) {
      return { ...empty, rejectionReason: 'no_api_candidates' };
    }

    const targetTime = targetDate.getTime();
    const targetSpeciesNorm = this.normalizeSpecies(targetSpecies);
    const targetLocationLower = targetLocation.toLowerCase();
    const targetCoords = this.parseCoordinates(targetLocation);

    const speciesMatches = candidates.filter(c => {
      const comNameNorm = this.normalizeSpecies(c.comName);
      return comNameNorm === targetSpeciesNorm ||
             comNameNorm.includes(targetSpeciesNorm) ||
             targetSpeciesNorm.includes(comNameNorm);
    });

    if (speciesMatches.length === 0) {
      return {
        ...empty,
        rejectionReason: 'no_species_match',
      };
    }

    const seventyTwoHours = 72 * 60 * 60 * 1000;
    const withinWindow = speciesMatches.filter(c => {
      const obsTime = new Date(c.obsDt).getTime();
      return Math.abs(obsTime - targetTime) <= seventyTwoHours;
    });

    const candidatesToScore = withinWindow.length > 0 ? withinWindow : speciesMatches;

    const scored = candidatesToScore.map(c => {
      const obsTime = new Date(c.obsDt).getTime();
      const timeDiff = Math.abs(obsTime - targetTime);
      const targetWords = targetLocationLower.split(/\W+/).filter(w => w.length > 2);
      const candidateWords = c.locName.toLowerCase().split(/\W+/).filter(w => w.length > 2);
      const intersection = targetWords.filter(w => candidateWords.includes(w));
      let locationScore = intersection.length;

      let distanceScore = 0;
      if (targetCoords) {
        const dist = calculateDistance(targetCoords.lat, targetCoords.lng, c.lat, c.lng);
        distanceScore = Math.max(0, 5 - (dist / 2));
      }

      const timeScore = Math.max(0, 2 - (timeDiff / (24 * 60 * 60 * 1000)));
      const totalScore = locationScore + distanceScore + timeScore;

      return { candidate: c, totalScore, timeDiff, locationScore, distanceScore };
    });

    scored.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return a.timeDiff - b.timeDiff;
    });

    const best = scored[0]!;
    if (best.timeDiff > seventyTwoHours) {
      console.log(`Match rejected for ${targetSpecies} at ${targetLocation}: Best candidate was ${Math.round(best.timeDiff / 3600000)}h away.`);
      return {
        match: null,
        apiCandidateCount: candidates.length,
        speciesMatchCount: speciesMatches.length,
        timeWindowMatchCount: withinWindow.length,
        rejectionReason: 'outside_time_window',
      };
    }

    return {
      match: best.candidate,
      apiCandidateCount: candidates.length,
      speciesMatchCount: speciesMatches.length,
      timeWindowMatchCount: withinWindow.length,
    };
  }

  private normalizeSpecies(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove non-alphanumeric except spaces
      .split(/\s+/) // Split into words
      .filter(w => w !== 'warbler' && w !== 'goose' && w !== 'duck' && w !== 'bird') // Remove noise words
      .sort() // Sort words alphabetically
      .join(''); // Join back
  }
}
