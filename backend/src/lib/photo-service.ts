import { prisma } from './db.js';
import {
  INAT_PHOTO_LICENSE_FILTER,
  isAllowedINaturalistPhoto,
} from './photo-policy.js';

export interface SpeciesPhoto {
  photoUrl: string | null;
  attribution: string | null;
  sourceUrl: string | null;
}

export class PhotoService {
  private INAT_API_BASE = 'https://api.inaturalist.org/v1';
  private CACHE_EXPIRATION_DAYS = 30;
  private static pendingFetches = new Map<string, Promise<SpeciesPhoto | null>>();

  async fetchSpeciesPhoto(speciesName: string): Promise<SpeciesPhoto | null> {
    // Check if there is already a fetch in progress for this species
    const pending = PhotoService.pendingFetches.get(speciesName);
    if (pending) {
      return pending;
    }

    // Define the full fetch process as a single promise to be tracked
    const fetchPromise = (async () => {
      try {
        const cached = await prisma.speciesPhoto.findUnique({
          where: { speciesName },
        });

        if (cached) {
          const isStale =
            new Date().getTime() - new Date(cached.fetchedAt).getTime() >
            this.CACHE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
          
          if (!isStale) {
            if (!cached.photoUrl) return null;
            return {
              photoUrl: cached.photoUrl,
              attribution: cached.attribution,
              sourceUrl: cached.sourceUrl,
            };
          }
        }

        return await this.refreshCache(speciesName);
      } finally {
        // Clean up after completion
        PhotoService.pendingFetches.delete(speciesName);
      }
    })();

    PhotoService.pendingFetches.set(speciesName, fetchPromise);
    return fetchPromise;
  }

  async needsFetch(speciesName: string): Promise<boolean> {
    const cached = await prisma.speciesPhoto.findUnique({
      where: { speciesName },
    });

    if (!cached) return true;

    const isStale =
      new Date().getTime() - new Date(cached.fetchedAt).getTime() >
      this.CACHE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
    
    return isStale;
  }

  private async refreshCache(speciesName: string): Promise<SpeciesPhoto | null> {
    const cached = await prisma.speciesPhoto.findUnique({
      where: { speciesName },
    });
    try {
      const url = new URL(`${this.INAT_API_BASE}/taxa`);
      url.searchParams.append('q', speciesName);
      url.searchParams.append('rank', 'species');
      url.searchParams.append('per_page', '1');

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`iNaturalist API error: ${response.status}`);
      }

      const data = await response.json();
      const taxonId = data.results?.[0]?.id;
      let photoData = null;
      let sourceUrl = null;

      if (taxonId) {
        const observationsUrl = new URL(`${this.INAT_API_BASE}/observations`);
        observationsUrl.searchParams.append('taxon_id', String(taxonId));
        observationsUrl.searchParams.append('photos', 'true');
        observationsUrl.searchParams.append('photo_license', INAT_PHOTO_LICENSE_FILTER);
        observationsUrl.searchParams.append('quality_grade', 'research');
        observationsUrl.searchParams.append('per_page', '10');
        observationsUrl.searchParams.append('order_by', 'votes');
        observationsUrl.searchParams.append('order', 'desc');

        const observationsResponse = await fetch(observationsUrl.toString());
        if (!observationsResponse.ok) {
          throw new Error(`iNaturalist API error: ${observationsResponse.status}`);
        }

        const observationsData = await observationsResponse.json();
        for (const observation of observationsData.results ?? []) {
          photoData = observation.photos?.find(
            (photo: { license_code?: string | null; url?: string | null }) =>
              isAllowedINaturalistPhoto({
                licenseCode: photo.license_code,
                photoUrl: photo.url,
                sourceUrl: observation.uri,
              }),
          );
          if (photoData) {
            sourceUrl = observation.uri;
            break;
          }
        }
      }

      const photoUrl = photoData?.url?.replace('/square.', '/medium.') || null;
      const attribution = photoData?.attribution || null;

      await prisma.speciesPhoto.upsert({
        where: { speciesName },
        update: {
          photoUrl,
          attribution,
          sourceUrl,
          fetchedAt: new Date(),
        },
        create: {
          speciesName,
          photoUrl,
          attribution,
          sourceUrl,
          fetchedAt: new Date(),
        },
      });

      if (!photoUrl) return null;
      return { photoUrl, attribution, sourceUrl };
    } catch (error) {
      console.error(`Failed to fetch photo for ${speciesName}:`, error);
      if (cached) {
        if (!cached.photoUrl) return null;
        return {
          photoUrl: cached.photoUrl,
          attribution: cached.attribution,
          sourceUrl: cached.sourceUrl,
        };
      }
      return null;
    }
  }
}
