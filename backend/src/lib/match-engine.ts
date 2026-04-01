import { EbirdClient, EbirdObservation } from './ebird-client.js';
import { Sighting } from '@prisma/client';

export class MatchEngine {
  constructor(private ebirdClient: EbirdClient) {}

  async findMatch(sighting: Sighting): Promise<EbirdObservation | null> {
    const { species, location, date } = sighting;
    
    // 1. Try to parse coordinates from the location string
    // Example: "Deering Rd, Capital CA-BC 48.58130, -124.39482"
    // or: "Newport Rd, Corinna (44.9071,-69.2646)"
    const coords = this.parseCoordinates(location);
    
    let candidates: EbirdObservation[] = [];
    
    if (coords) {
      // If we have coordinates, search nearby (radius 5km)
      candidates = await this.ebirdClient.getNearbyNotableObservations(coords.lat, coords.lng, 5);
    } else {
      // Fallback: search by region if possible (needs a region code, defaulting to state/country from location if we had a mapper)
      // For now, let's assume we can try a broad search or we might need region extraction logic
      // Extraction logic for regionCode (e.g., "CA-BC")
      const regionMatch = location.match(/[A-Z]{2}-[A-Z]{2,3}/);
      if (regionMatch) {
        candidates = await this.ebirdClient.getNotableObservations(regionMatch[0]);
      }
    }

    if (candidates.length === 0) return null;

    // 2. Fuzzy match candidates by species name, location name, and date
    return this.selectBestMatch(candidates, species, location, date);
  }

  private parseCoordinates(location: string): { lat: number; lng: number } | null {
    // Matches "48.58130, -124.39482" or "(44.9071,-69.2646)"
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

  private selectBestMatch(candidates: EbirdObservation[], targetSpecies: string, targetLocation: string, targetDate: Date): EbirdObservation | null {
    const targetTime = targetDate.getTime();
    const targetSpeciesLower = targetSpecies.toLowerCase();
    const targetLocationLower = targetLocation.toLowerCase();
    
    // 1. Filter by species name similarity
    const speciesMatches = candidates.filter(c => {
      const comNameLower = c.comName.toLowerCase();
      return comNameLower === targetSpeciesLower ||
             comNameLower.includes(targetSpeciesLower) ||
             targetSpeciesLower.includes(comNameLower);
    });

    if (speciesMatches.length === 0) return null;

    // 2. Score candidates based on time and location similarity
    const scored = speciesMatches.map(c => {
      const obsTime = new Date(c.obsDt).getTime();
      const timeDiff = Math.abs(obsTime - targetTime);
      
      // Simple location similarity: count shared words
      const targetWords = targetLocationLower.split(/\W+/).filter(w => w.length > 2);
      const candidateWords = c.locName.toLowerCase().split(/\W+/).filter(w => w.length > 2);
      const intersection = targetWords.filter(w => candidateWords.includes(w));
      const locationScore = intersection.length;

      return { candidate: c, timeDiff, locationScore };
    });

    // 3. Sort by location score (desc), then time difference (asc)
    scored.sort((a, b) => {
      if (b.locationScore !== a.locationScore) {
        return b.locationScore - a.locationScore;
      }
      return a.timeDiff - b.timeDiff;
    });

    const best = scored[0]!;
    
    // Only accept if within 24 hours
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (best.timeDiff > twentyFourHours) {
      return null;
    }

    return best.candidate;
  }
}

