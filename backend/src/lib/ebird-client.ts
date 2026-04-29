export interface EbirdObservation {
  speciesCode: string;
  comName: string;
  sciName: string;
  locId: string;
  locName: string;
  obsDt: string;
  howMany?: number;
  lat: number;
  lng: number;
  obsValid: boolean;
  obsReviewed: boolean;
  locationPrivate: boolean;
  subId: string;
  subnational1Code?: string;
  subnational1Name?: string;
  userDisplayName?: string;
  hasComments?: boolean;
}

export interface EbirdChecklist {
  subId: string;
  locId: string;
  obsDt: string;
  obs: {
    speciesCode: string;
    howManyStr: string;
    comments?: string;
  }[];
}

/**
 * Client for interacting with the eBird API (v2).
 * Provides methods for fetching notable observations, checklists, and subregions.
 * Includes built-in exponential backoff retry logic for network errors.
 */
export class EbirdClient {
  private baseUrl = 'https://api.ebird.org/v2';

  /**
   * @param {string} apiKey - The eBird API key for authentication.
   */
  constructor(private apiKey: string) {}

  /**
   * Performs a GET request to the eBird API with retries.
   * 
   * @param {string} path - The API endpoint path.
   * @param {Record<string, string | number | boolean>} [params={}] - Query parameters.
   * @param {number} [retries=3] - Maximum number of retries for network errors.
   * @returns {Promise<any>} The parsed JSON response.
   * @private
   */
  private async get(path: string, params: Record<string, string | number | boolean> = {}, retries = 3) {
    const url = new URL(`${this.baseUrl}${path}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url.toString(), {
          headers: {
            'x-ebirdapitoken': this.apiKey,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`eBird API error ${response.status}: ${errorText}`);
        }

        return await response.json();
      } catch (error) {
        const isLastRetry = i === retries - 1;
        const isNetworkError = error instanceof Error && 
          (error.name === 'TypeError' || error.message.includes('getaddrinfo') || error.message.includes('ENOTFOUND'));
        
        if (isLastRetry || !isNetworkError) {
          throw error;
        }
        
        const delay = Math.pow(2, i) * 1000;
        console.warn(`eBird API request failed (attempt ${i + 1}/${retries}), retrying in ${delay}ms...`, error instanceof Error ? error.message : error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Fetches notable observations for a specific region.
   * 
   * @param {string} regionCode - The eBird region code (e.g., 'US-PA').
   * @param {number} [back=14] - Number of days to look back.
   * @returns {Promise<EbirdObservation[]>} List of notable observations.
   */
  async getNotableObservations(regionCode: string, back: number = 14): Promise<EbirdObservation[]> {
    return this.get(`/data/obs/${regionCode}/recent/notable`, {
      back,
      detail: 'full',
      maxResults: 10000,
    });
  }

  /**
   * Fetches notable observations within a radius of a geographic coordinate.
   * 
   * @param {number} lat - Latitude.
   * @param {number} lng - Longitude.
   * @param {number} [dist=50] - Radius in kilometers (0-50).
   * @param {number} [back=14] - Number of days to look back.
   * @returns {Promise<EbirdObservation[]>} List of notable observations nearby.
   */
  async getNearbyNotableObservations(lat: number, lng: number, dist: number = 50, back: number = 14): Promise<EbirdObservation[]> {
    return this.get('/data/obs/geo/recent/notable', {
      lat,
      lng,
      dist,
      back,
      detail: 'full',
      maxResults: 10000,
    });
  }

  /**
   * Fetches a detailed eBird checklist by its subId.
   * 
   * @param {string} subId - The eBird submission/checklist ID.
   * @returns {Promise<EbirdChecklist>} The checklist details.
   */
  async getChecklist(subId: string): Promise<EbirdChecklist> {
    return this.get(`/product/checklist/view/${subId}`);
  }

  /**
   * Fetches a list of subregions for a parent region.
   * 
   * @param {'country' | 'subnational1' | 'subnational2'} regionType - The type of subregion to fetch.
   * @param {string} parentRegionCode - The parent region code.
   * @returns {Promise<{ code: string; name: string }[]>} List of subregions.
   */
  async getSubregions(regionType: 'country' | 'subnational1' | 'subnational2', parentRegionCode: string): Promise<{ code: string; name: string }[]> {
    return this.get(`/ref/region/list/${regionType}/${parentRegionCode}`);
  }
}
