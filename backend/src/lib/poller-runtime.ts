export function validateProductionPollerEnvironment(writeSightings: boolean): void {
  if (writeSightings && !process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is required for production polling');
  }
}

interface PhotoHydrator {
  needsFetch(speciesName: string): Promise<boolean>;
  fetchSpeciesPhoto(speciesName: string): Promise<unknown>;
}

export interface PhotoHydrationResult {
  checked: number;
  refreshed: number;
  failed: number;
}

export async function hydrateSpeciesPhotos(
  speciesNames: string[],
  photoService: PhotoHydrator,
): Promise<PhotoHydrationResult> {
  const uniqueSpeciesNames = [...new Set(speciesNames)];
  const result = { checked: uniqueSpeciesNames.length, refreshed: 0, failed: 0 };

  for (const speciesName of uniqueSpeciesNames) {
    try {
      if (await photoService.needsFetch(speciesName)) {
        await photoService.fetchSpeciesPhoto(speciesName);
        result.refreshed += 1;
      }
    } catch (error) {
      result.failed += 1;
      console.error(`Poller photo hydration failed for ${speciesName}:`, error);
    }
  }

  return result;
}
