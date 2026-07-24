import { prisma } from './db.js';
import type { EnrichmentLoggingContext } from './enrichment-logging.js';
import { sanitizeLogError } from './enrichment-logging.js';

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

export interface EbirdTaxonomyEntry {
  speciesCode: string;
  comName: string;
  sciName: string;
  category: string;
}

export interface EbirdLocationInfo {
  locId: string;
  locName: string;
  name?: string;
  countryCode?: string;
  countryName?: string;
  subnational1Name?: string;
  subnational1Code?: string;
  subnational2Name?: string;
  subnational2Code?: string;
  hierarchicalName?: string;
  lat?: number;
  lng?: number;
}

async function logApiCall(context: EnrichmentLoggingContext | undefined, data: {
  endpoint: string;
  params: Record<string, string | number | boolean>;
  httpStatus?: number;
  durationMs: number;
  attemptNumber: number;
  maxAttempts: number;
  responseItemCount?: number;
  errorMessage?: string;
}) {
  if (!context?.ingestionRunId && !context?.enrichmentAttemptId &&
      !context?.alertPollRunId && !context?.alertTargetPollAttemptId) return;

  try {
    await prisma.ebirdApiCallLog.create({
      data: {
        ingestionRunId: context.ingestionRunId ?? null,
        enrichmentAttemptId: context.enrichmentAttemptId ?? null,
        alertPollRunId: context.alertPollRunId ?? null,
        alertTargetPollAttemptId: context.alertTargetPollAttemptId ?? null,
        endpoint: data.endpoint,
        paramsJson: JSON.stringify(data.params),
        httpStatus: data.httpStatus ?? null,
        durationMs: data.durationMs,
        attemptNumber: data.attemptNumber,
        maxAttempts: data.maxAttempts,
        responseItemCount: data.responseItemCount ?? null,
        errorMessage: data.errorMessage ?? null,
      },
    });
  } catch (error) {
    throw new Error(`Failed to persist eBird API diagnostics: ${sanitizeLogError(error)}`);
  }
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
  private async get(path: string, params: Record<string, string | number | boolean> = {}, retries = 3, context?: EnrichmentLoggingContext) {
    const url = new URL(`${this.baseUrl}${path}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    for (let i = 0; i < retries; i++) {
      const started = Date.now();
      try {
        const response = await fetch(url.toString(), {
          headers: {
            'x-ebirdapitoken': this.apiKey,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          await logApiCall(context, {
            endpoint: path,
            params,
            httpStatus: response.status,
            durationMs: Date.now() - started,
            attemptNumber: i + 1,
            maxAttempts: retries,
            errorMessage: `eBird API error ${response.status}: ${errorText}`,
          });
          throw new Error(`eBird API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const logData = {
          endpoint: path,
          params,
          httpStatus: response.status,
          durationMs: Date.now() - started,
          attemptNumber: i + 1,
          maxAttempts: retries,
        };
        await logApiCall(context, Array.isArray(data) ? { ...logData, responseItemCount: data.length } : logData);
        return data;
      } catch (error) {
        const isLastRetry = i === retries - 1;
        const isRetryableError = (error instanceof Error && 
          (error.name === 'TypeError' || error.message.includes('getaddrinfo') || error.message.includes('ENOTFOUND'))) ||
          (error instanceof Error && error.message.startsWith('eBird API error 5')) ||
          (error instanceof Error && error.message.startsWith('eBird API error 429'));
        
        if (!(error instanceof Error && error.message.startsWith('eBird API error '))) {
          await logApiCall(context, {
            endpoint: path,
            params,
            durationMs: Date.now() - started,
            attemptNumber: i + 1,
            maxAttempts: retries,
            errorMessage: sanitizeLogError(error),
          });
        }

        if (isLastRetry || !isRetryableError) {
          throw error;
        }
        
        const delay = error instanceof Error && error.message.startsWith('eBird API error 429')
          ? Math.pow(2, i) * 5000
          : Math.pow(2, i) * 1000;
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
  async getNotableObservations(regionCode: string, back: number = 14, context?: EnrichmentLoggingContext): Promise<EbirdObservation[]> {
    return this.get(`/data/obs/${regionCode}/recent/notable`, {
      back,
      detail: 'full',
      maxResults: 10000,
    }, 3, context);
  }

  async getSpeciesObservations(regionCode: string, speciesCode: string, back: number = 14, context?: EnrichmentLoggingContext): Promise<EbirdObservation[]> {
    return this.get(`/data/obs/${regionCode}/recent/${speciesCode}`, {
      back,
      detail: 'full',
      maxResults: 10000,
      includeProvisional: true,
    }, 3, context);
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
  async getNearbyNotableObservations(lat: number, lng: number, dist: number = 50, back: number = 14, context?: EnrichmentLoggingContext): Promise<EbirdObservation[]> {
    return this.get('/data/obs/geo/recent/notable', {
      lat,
      lng,
      dist,
      back,
      detail: 'full',
      maxResults: 10000,
    }, 3, context);
  }

  /**
   * Fetches a detailed eBird checklist by its subId.
   * 
   * @param {string} subId - The eBird submission/checklist ID.
   * @returns {Promise<EbirdChecklist>} The checklist details.
   */
  async getChecklist(subId: string, context?: EnrichmentLoggingContext): Promise<EbirdChecklist> {
    return this.get(`/product/checklist/view/${subId}`, {}, 3, context);
  }

  /**
   * Fetches a list of subregions for a parent region.
   * 
   * @param {'country' | 'subnational1' | 'subnational2'} regionType - The type of subregion to fetch.
   * @param {string} parentRegionCode - The parent region code.
   * @returns {Promise<{ code: string; name: string }[]>} List of subregions.
   */
  async getSubregions(regionType: 'country' | 'subnational1' | 'subnational2', parentRegionCode: string, context?: EnrichmentLoggingContext): Promise<{ code: string; name: string }[]> {
    return this.get(`/ref/region/list/${regionType}/${parentRegionCode}`, {}, 3, context);
  }

  async getTaxonomy(context?: EnrichmentLoggingContext): Promise<EbirdTaxonomyEntry[]> {
    return this.get('/ref/taxonomy/ebird', {
      fmt: 'json',
    }, 3, context);
  }

  async getLocationInfo(locId: string, context?: EnrichmentLoggingContext): Promise<EbirdLocationInfo> {
    return this.get(`/ref/hotspot/info/${locId}`, {}, 3, context);
  }
}
