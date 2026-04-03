interface Sighting {
  id: number;
  species: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Calculates distance between two points in kilometers using the Haversine formula.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Filters a list of sightings to those within a certain radius of a point.
 * Sightings without coordinates are always excluded from the filtered result.
 */
export function filterByProximity<T extends Sighting>(
  sightings: T[], 
  userLat: number, 
  userLng: number, 
  radiusKm: number
): T[] {
  return sightings.filter(s => {
    if (s.latitude === null || s.longitude === null) return false;
    const distance = calculateDistance(userLat, userLng, s.latitude, s.longitude);
    return distance <= radiusKm;
  });
}
