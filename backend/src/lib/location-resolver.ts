import type { EbirdLocationInfo, EbirdObservation } from './ebird-client.js';

export interface ResolvedObservationLocation {
  locationName: string;
  county: string | null;
  state: string | null;
  country: string | null;
  source: 'ebird_loc_id' | 'reverse_geocode' | 'target_region' | 'raw';
}

interface ReverseGeocodeResult {
  address?: {
    county?: string;
    state?: string;
    province?: string;
    territory?: string;
    country?: string;
  };
}

function hasUsableLocationHint(locationName: string): boolean {
  if (/[-+]?\d{1,3}\.\d+/.test(locationName)) return false;
  if (/\b[A-Z]{2}-[A-Z]{2}\b/.test(locationName)) return false;
  return true;
}

function locationNameIncludesRegion(locationName: string, regionName: string): boolean {
  return locationName.toLowerCase().includes(regionName.toLowerCase());
}

function formatLocation(locationName: string, county: string | null, state: string | null, fallbackRegionName?: string): string {
  if (county && state) return `${formatCountyName(county)}, ${state}`;
  if (state) return state;
  if (fallbackRegionName) {
    if (!hasUsableLocationHint(locationName)) return fallbackRegionName;
    if (locationNameIncludesRegion(locationName, fallbackRegionName)) return locationName;
    return `${locationName}, ${fallbackRegionName}`;
  }
  return locationName;
}

function formatCountyName(county: string): string {
  return county.replace(/\s+County$/i, '').trim();
}

export class LocationResolver {
  private reverseCache = new Map<string, ResolvedObservationLocation | null>();
  private lastReverseLookupAt = 0;

  constructor(
    private getLocationInfo: (locId: string) => Promise<EbirdLocationInfo | null>,
    private reverseLookupDelayMs = 1000,
  ) {}

  async resolve(observation: EbirdObservation, fallbackRegionName?: string): Promise<ResolvedObservationLocation> {
    if (observation.locId) {
      const locationInfo = await this.getLocationInfo(observation.locId);
      const resolved = this.resolveFromEbirdLocationInfo(observation, locationInfo, fallbackRegionName);
      if (resolved) return resolved;
    }

    const reverse = await this.resolveFromCoordinates(observation, fallbackRegionName);
    if (reverse) return reverse;

    return {
      locationName: formatLocation(observation.locName, null, null, fallbackRegionName),
      county: null,
      state: fallbackRegionName ?? null,
      country: null,
      source: fallbackRegionName ? 'target_region' : 'raw',
    };
  }

  private resolveFromEbirdLocationInfo(observation: EbirdObservation, locationInfo: EbirdLocationInfo | null, fallbackRegionName?: string): ResolvedObservationLocation | null {
    if (!locationInfo) return null;

    const county = locationInfo.subnational2Name ?? null;
    const state = locationInfo.subnational1Name ?? fallbackRegionName ?? null;
    const country = locationInfo.countryName ?? null;
    if (!county && !state && !country) return null;

    return {
      locationName: formatLocation(observation.locName, county, state, fallbackRegionName),
      county,
      state,
      country,
      source: 'ebird_loc_id',
    };
  }

  private async resolveFromCoordinates(observation: EbirdObservation, fallbackRegionName?: string): Promise<ResolvedObservationLocation | null> {
    if (!Number.isFinite(observation.lat) || !Number.isFinite(observation.lng)) return null;

    const cacheKey = `${observation.lat.toFixed(3)},${observation.lng.toFixed(3)}`;
    if (this.reverseCache.has(cacheKey)) {
      return this.reverseCache.get(cacheKey) ?? null;
    }

    const elapsed = Date.now() - this.lastReverseLookupAt;
    if (elapsed < this.reverseLookupDelayMs) {
      await new Promise(resolve => setTimeout(resolve, this.reverseLookupDelayMs - elapsed));
    }
    this.lastReverseLookupAt = Date.now();

    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('zoom', '10');
      url.searchParams.set('lat', String(observation.lat));
      url.searchParams.set('lon', String(observation.lng));

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'twitcher-rare-bird-dashboard/1.0',
          'Accept': 'application/json',
        },
      });
      if (!response.ok) throw new Error(`Reverse geocode failed: ${response.status}`);

      const data = await response.json() as ReverseGeocodeResult;
      const county = data.address?.county ?? null;
      const state = data.address?.state ?? data.address?.province ?? data.address?.territory ?? fallbackRegionName ?? null;
      const country = data.address?.country ?? null;
      if (!county && !state && !country) {
        this.reverseCache.set(cacheKey, null);
        return null;
      }

      const resolved = {
        locationName: formatLocation(observation.locName, county, state, fallbackRegionName),
        county,
        state,
        country,
        source: 'reverse_geocode' as const,
      };
      this.reverseCache.set(cacheKey, resolved);
      return resolved;
    } catch {
      this.reverseCache.set(cacheKey, null);
      return null;
    }
  }
}
