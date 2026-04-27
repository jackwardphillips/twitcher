import type { Sighting as SightingData } from './ebird-parser.js';
import { prisma } from './db.js';
import { EbirdClient } from './ebird-client.js';
import { MatchEngine } from './match-engine.js';
import { EnrichmentService } from './enrichment-service.js';
import { RegionService } from './region-service.js';
import { findMatchingIncident, createIncident, addSightingToIncident, normalizeScientificName } from './incident-service.js';
import 'dotenv/config';

// Initialize services for background enrichment
const ebirdClient = new EbirdClient(process.env.EBIRD_API_KEY || '');
const matchEngine = new MatchEngine(ebirdClient);
const regionService = new RegionService(ebirdClient);
const enrichmentService = new EnrichmentService(matchEngine, regionService);

export interface EnrichmentResult {
  attempted: number;
  succeeded: number;
  failed: number;
}

export async function saveSightings(sightings: SightingData[], enrich = true): Promise<EnrichmentResult | null> {
  // Fetch rarity codes for all species in this batch
  const uniqueScientificNames = [...new Set(sightings.map(s => s.scientificName))].filter(Boolean) as string[];
  const rarityRecords = await prisma.rarityCode.findMany({
    where: { scientificName: { in: uniqueScientificNames } },
  });

  const rarityMap = new Map(rarityRecords.map(r => [r.scientificName, r.abaCode]));

  for (const sightingData of sightings) {
    const rarity = sightingData.scientificName ? (rarityMap.get(sightingData.scientificName) ?? 0) : 0;

    // Parse coordinates from mapUrl if available (eBird alerts usually have this)
    let latitude = null;
    let longitude = null;
    if (sightingData.mapUrl) {
      const coords = sightingData.mapUrl.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coords) {
        latitude = parseFloat(coords[1]!);
        longitude = parseFloat(coords[2]!);
      }
    }

    const sighting = await prisma.sighting.create({
      data: {
        species: sightingData.species,
        scientificName: sightingData.scientificName,
        location: sightingData.location,
        date: sightingData.date,
        observer: sightingData.observer,
        rarity: rarity,
        details: sightingData.comments,
        mapUrl: sightingData.mapUrl,
        checklistUrl: sightingData.checklistUrl,
        latitude,
        longitude,
      },
    });

    // Clustering Logic
    if (sighting.latitude !== null && sighting.longitude !== null) {
      const normScientific = normalizeScientificName(sighting.scientificName || '', sighting.species);
      const matchingIncidents = await findMatchingIncident(prisma, normScientific, sighting.latitude, sighting.longitude, sighting.date);
      
      if (matchingIncidents.length > 0) {
        await addSightingToIncident(prisma, matchingIncidents, sighting);
      } else {
        await createIncident(prisma, sighting);
      }
    }
  }

  // Automatically trigger background enrichment for all unenriched sightings in the last 3 days
  if (enrich) {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const recentUnenriched = await prisma.sighting.findMany({
      where: {
        subId: null,
        date: { gte: threeDaysAgo },
      },
    });

    try {
      return await enrichmentService.enrichSightings(recentUnenriched);
    } catch (err) {
      console.error('Background enrichment failed:', err);
      return { attempted: recentUnenriched.length, succeeded: 0, failed: recentUnenriched.length };
    }
  }

  return null;
}
