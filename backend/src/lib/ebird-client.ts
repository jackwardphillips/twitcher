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

export class EbirdClient {
  private baseUrl = 'https://api.ebird.org/v2';

  constructor(private apiKey: string) {}

  private async get(path: string, params: Record<string, string | number | boolean> = {}) {
    const url = new URL(`${this.baseUrl}${path}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    const response = await fetch(url.toString(), {
      headers: {
        'x-ebirdapitoken': this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`eBird API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async getNotableObservations(regionCode: string, back: number = 14): Promise<EbirdObservation[]> {
    return this.get(`/data/obs/${regionCode}/recent/notable`, {
      back,
      detail: 'full',
      maxResults: 10000,
    });
  }

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

  async getChecklist(subId: string): Promise<EbirdChecklist> {
    return this.get(`/product/checklist/view/${subId}`);
  }

  async getSubregions(regionType: 'country' | 'subnational1' | 'subnational2', parentRegionCode: string): Promise<{ code: string; name: string }[]> {
    return this.get(`/ref/region/list/${regionType}/${parentRegionCode}`);
  }
}
