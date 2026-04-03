import { EbirdClient } from './ebird-client.js';

export class RegionService {
  // Cache for subnational2 regions: parentCode -> list of subregions
  private subregionCache = new Map<string, { code: string; name: string }[]>();

  constructor(private ebirdClient: EbirdClient) {}

  /**
   * Tries to find a county/subnational2 code for a given county name and state/province code.
   * e.g., ("San Diego", "US-CA") -> "US-CA-073"
   */
  async findSubregionCode(countyName: string, subnational1Code: string): Promise<string | null> {
    const subregions = await this.getCachedSubregions(subnational1Code);
    
    // Normalize names for comparison (lowercase, remove "County" suffix if present in one but not other)
    const norm = (s: string) => s.toLowerCase().replace(/\s+county\b/g, '').trim();
    const target = norm(countyName);

    const match = subregions.find(r => norm(r.name) === target);
    return match ? match.code : null;
  }

  private async getCachedSubregions(subnational1Code: string): Promise<{ code: string; name: string }[]> {
    if (!this.subregionCache.has(subnational1Code)) {
      console.log(`Caching subregions for ${subnational1Code}...`);
      try {
        const subregions = await this.ebirdClient.getSubregions('subnational2', subnational1Code);
        this.subregionCache.set(subnational1Code, subregions);
      } catch (error) {
        console.error(`Failed to fetch subregions for ${subnational1Code}:`, error);
        return [];
      }
    }
    return this.subregionCache.get(subnational1Code) || [];
  }
}
