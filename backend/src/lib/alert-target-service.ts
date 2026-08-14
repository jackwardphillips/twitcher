import type { AlertTarget, Prisma, Sighting } from '@prisma/client';
import { prisma } from './db.js';
import { EbirdClient } from './ebird-client.js';
import type { EbirdLocationInfo, EbirdObservation, EbirdTaxonomyEntry } from './ebird-client.js';
import { parseEBirdAlertSummary } from './alert-summary-parser.js';
import { EnrichmentService } from './enrichment-service.js';
import {
  addSightingToIncident,
  createIncident,
  findMatchingIncident,
  normalizeScientificName,
  reconcileIncidentFromPresentSightings,
  reopenClosedIncident,
} from './incident-service.js';
import { sanitizeLogError } from './enrichment-logging.js';
import type { EnrichmentLoggingContext } from './enrichment-logging.js';
import { LocationResolver } from './location-resolver.js';
import type { ResolvedObservationLocation } from './location-resolver.js';
import { findExistingSightingForObservation } from './sighting-observation-match.js';

export interface AlertTargetDraft {
  speciesName: string;
  regionName: string;
  regionCode: string;
  expectedReports: number;
}

export interface AlertTargetPollOptions {
  back?: number;
  dryRun?: boolean;
  writeSightings?: boolean;
  alertPollRunId?: string;
}

export interface AlertTargetPollResult {
  targetId?: string;
  speciesName: string;
  regionCode: string;
  speciesCode?: string | null;
  status: 'success' | 'missing_species_code' | 'error';
  observationsFound: number;
  shadowObservationsWritten: number;
  sightingsCreated: number;
  incidentsTouched: number;
  observationsMissing: number;
  observationsRemoved: number;
  observationsRestored: number;
  errorMessage?: string;
}

function normalizeSpeciesName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

function observationDate(obsDt: string): Date {
  const date = new Date(obsDt);
  return isNaN(date.getTime()) ? new Date() : date;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class AlertTargetService {
  private taxonomyCache: EbirdTaxonomyEntry[] | null = null;
  private locationInfoCache = new Map<string, EbirdLocationInfo | null>();
  private locationResolver = new LocationResolver(locId => this.getLocationInfo(locId));

  constructor(private ebirdClient: EbirdClient) {}

  parseTargetsFromEmail(content: string): AlertTargetDraft[] {
    return parseEBirdAlertSummary(content)
      .map(target => ({
        speciesName: target.species,
        regionName: target.regionName,
        regionCode: EnrichmentService.getRegionCode(target.regionName),
        expectedReports: target.expectedReports,
      }))
      .filter((target): target is AlertTargetDraft => !!target.regionCode);
  }

  async upsertTargetsFromEmail(content: string, sourceEmailId?: number | null, emailDate: Date = new Date()): Promise<AlertTarget[]> {
    const targets = this.parseTargetsFromEmail(content);
    const saved: AlertTarget[] = [];

    for (const target of targets) {
      saved.push(await prisma.alertTarget.upsert({
        where: {
          speciesName_regionCode: {
            speciesName: target.speciesName,
            regionCode: target.regionCode,
          },
        },
        create: {
          speciesName: target.speciesName,
          regionName: target.regionName,
          regionCode: target.regionCode,
          expectedReports: target.expectedReports,
          sourceEmailId: sourceEmailId ?? null,
          firstSeenInEmailAt: emailDate,
          lastSeenInEmailAt: emailDate,
          status: 'active',
        },
        update: {
          regionName: target.regionName,
          expectedReports: target.expectedReports,
          sourceEmailId: sourceEmailId ?? null,
          lastSeenInEmailAt: emailDate,
          status: 'active',
        },
      }));
    }

    return saved;
  }

  async resolveSpeciesCode(speciesName: string, context?: EnrichmentLoggingContext): Promise<string | null> {
    if (!this.taxonomyCache) {
      this.taxonomyCache = await this.ebirdClient.getTaxonomy(context);
    }

    const normalized = normalizeSpeciesName(speciesName);
    const exact = this.taxonomyCache.find(entry => normalizeSpeciesName(entry.comName) === normalized);
    if (exact) return exact.speciesCode;

    const withoutQualifier = speciesName.replace(/\s+\(.+\)$/, '');
    const fallback = this.taxonomyCache.find(entry => normalizeSpeciesName(entry.comName) === normalizeSpeciesName(withoutQualifier));
    return fallback?.speciesCode ?? null;
  }

  async pollTarget(target: Pick<AlertTarget, 'id' | 'speciesName' | 'speciesCode' | 'regionName' | 'regionCode' | 'expectedReports'>, options: AlertTargetPollOptions = {}): Promise<AlertTargetPollResult> {
    const dryRun = options.dryRun ?? true;
    const writeSightings = options.writeSightings ?? false;
    let pollAttemptId: string | null = null;

    try {
      if (!dryRun) {
        const attempt = await prisma.alertTargetPollAttempt.create({
          data: {
            alertPollRunId: options.alertPollRunId ?? null,
            alertTargetId: target.id,
            status: 'running',
            speciesName: target.speciesName,
            speciesCode: target.speciesCode,
            regionName: target.regionName,
            regionCode: target.regionCode,
            expectedReports: target.expectedReports,
          },
        });
        pollAttemptId = attempt.id;
      }

      const loggingContext: EnrichmentLoggingContext = {};
      if (options.alertPollRunId) loggingContext.alertPollRunId = options.alertPollRunId;
      if (pollAttemptId) loggingContext.alertTargetPollAttemptId = pollAttemptId;
      const speciesCode = target.speciesCode ??
        await this.resolveSpeciesCode(target.speciesName, loggingContext);
      if (!speciesCode) {
        if (!dryRun) {
          await prisma.alertTargetPollAttempt.update({
            where: { id: pollAttemptId! },
            data: { status: 'missing_species_code', finishedAt: new Date() },
          });
        }

        return {
          targetId: target.id,
          speciesName: target.speciesName,
          regionCode: target.regionCode,
          speciesCode: null,
          status: 'missing_species_code',
          observationsFound: 0,
          shadowObservationsWritten: 0,
          sightingsCreated: 0,
          incidentsTouched: 0,
          observationsMissing: 0,
          observationsRemoved: 0,
          observationsRestored: 0,
        };
      }

      if (!dryRun) {
        await prisma.alertTarget.update({
          where: { id: target.id },
          data: { speciesCode },
        });
      }

      const observations = await this.ebirdClient.getSpeciesObservations(
        target.regionCode, speciesCode, options.back ?? 3, loggingContext);
      let shadowObservationsWritten = 0;
      let sightingsCreated = 0;
      let incidentsTouched = 0;
      let observationsMissing = 0;
      let observationsRemoved = 0;
      let observationsRestored = 0;

      if (!dryRun) {
        const now = new Date();
        const returnedSubIds = new Set(observations.map(observation => observation.subId).filter(Boolean));
        observationsRestored = await this.countRestoredObservations(target.id, returnedSubIds);

        for (const observation of observations) {
          const location = await this.locationResolver.resolve(observation, target.regionName);
          await this.writeShadowObservation(target.id, observation, location, options.alertPollRunId ?? null, now);
          shadowObservationsWritten++;
        }

        const lifecycleCounts = await this.markMissingObservations(target.id, returnedSubIds, now);
        observationsMissing = lifecycleCounts.observationsMissing;
        observationsRemoved = lifecycleCounts.observationsRemoved;

        await prisma.alertTarget.update({
          where: { id: target.id },
          data: { lastPolledAt: now },
        });
      }

      if (writeSightings) {
        const writeResult = await this.writeObservationsAsSightings(
          observations,
          target.regionName,
          target.regionCode,
        );
        sightingsCreated = writeResult.sightingsCreated;
        incidentsTouched = writeResult.incidentsTouched;
      }

      if (pollAttemptId) {
        await prisma.alertTargetPollAttempt.update({
          where: { id: pollAttemptId },
          data: {
            status: 'success',
            finishedAt: new Date(),
            observationsFound: observations.length,
            speciesCode,
            sightingsCreated,
            incidentsTouched,
            observationsMissing,
            observationsRemoved,
            observationsRestored,
          },
        });
      }

      return {
        targetId: target.id,
        speciesName: target.speciesName,
        regionCode: target.regionCode,
        speciesCode,
        status: 'success',
        observationsFound: observations.length,
        shadowObservationsWritten,
        sightingsCreated,
        incidentsTouched,
        observationsMissing,
        observationsRemoved,
        observationsRestored,
      };
    } catch (error) {
      const errorMessage = sanitizeLogError(error);
      if (pollAttemptId) {
        await prisma.alertTargetPollAttempt.update({
          where: { id: pollAttemptId },
          data: {
            status: 'error',
            finishedAt: new Date(),
            errorMessage,
          },
        });
      }

      return {
        targetId: target.id,
        speciesName: target.speciesName,
        regionCode: target.regionCode,
        speciesCode: target.speciesCode,
        status: 'error',
        observationsFound: 0,
        shadowObservationsWritten: 0,
        sightingsCreated: 0,
        incidentsTouched: 0,
        observationsMissing: 0,
        observationsRemoved: 0,
        observationsRestored: 0,
        errorMessage,
      };
    }
  }

  async pollActiveTargets(options: AlertTargetPollOptions = {}): Promise<AlertTargetPollResult[]> {
    const targets = await prisma.alertTarget.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        speciesName: true,
        speciesCode: true,
        regionName: true,
        regionCode: true,
        expectedReports: true,
        lastPolledAt: true,
        lastSeenInEmailAt: true,
      },
      orderBy: [
        { lastPolledAt: 'asc' },
        { lastSeenInEmailAt: 'desc' },
      ],
    });

    const results: AlertTargetPollResult[] = [];
    for (const target of targets) {
      results.push(await this.pollTarget(target, options));
    }
    return results;
  }

  private async getLocationInfo(locId: string): Promise<EbirdLocationInfo | null> {
    if (this.locationInfoCache.has(locId)) {
      return this.locationInfoCache.get(locId) ?? null;
    }

    try {
      await delay(150);
      const locationInfo = await this.ebirdClient.getLocationInfo(locId);
      this.locationInfoCache.set(locId, locationInfo);
      return locationInfo;
    } catch {
      this.locationInfoCache.set(locId, null);
      return null;
    }
  }

  private async countRestoredObservations(alertTargetId: string, returnedSubIds: Set<string>): Promise<number> {
    if (returnedSubIds.size === 0) return 0;

    return prisma.alertTargetObservation.count({
      where: {
        alertTargetId,
        subId: { in: Array.from(returnedSubIds) },
        status: { not: 'present' },
      },
    });
  }

  private async markMissingObservations(alertTargetId: string, returnedSubIds: Set<string>, now: Date): Promise<{ observationsMissing: number; observationsRemoved: number }> {
    const where: Prisma.AlertTargetObservationWhereInput = {
      alertTargetId,
      status: { not: 'removed' },
    };
    if (returnedSubIds.size > 0) {
      where.subId = { notIn: Array.from(returnedSubIds) };
    }

    const absentObservations = await prisma.alertTargetObservation.findMany({
      where,
      select: {
        id: true,
        subId: true,
        status: true,
        missingPollCount: true,
      },
    });

    let observationsMissing = 0;
    let observationsRemoved = 0;
    for (const observation of absentObservations) {
      const nextMissingPollCount = observation.missingPollCount + 1;
      if (observation.status === 'missing' && nextMissingPollCount >= 2) {
        await prisma.alertTargetObservation.update({
          where: { id: observation.id },
          data: {
            status: 'removed',
            removedAt: now,
            missingPollCount: nextMissingPollCount,
          },
        });
        await this.updateSightingLifecycle(observation.subId, {
          status: 'removed',
          removedAt: now,
          missingPollCount: nextMissingPollCount,
        });
        observationsRemoved++;
        continue;
      }

      const updateData: Prisma.AlertTargetObservationUpdateInput = {
        status: 'missing',
        missingPollCount: nextMissingPollCount,
      };
      if (observation.status !== 'missing') {
        updateData.missingSince = now;
      }

      await prisma.alertTargetObservation.update({
        where: { id: observation.id },
        data: updateData,
      });
      const sightingUpdateData: Prisma.SightingUpdateManyMutationInput = {
        status: 'missing',
        missingPollCount: nextMissingPollCount,
      };
      if (observation.status !== 'missing') {
        sightingUpdateData.missingSince = now;
      }
      await this.updateSightingLifecycle(observation.subId, sightingUpdateData);
      observationsMissing++;
    }

    return { observationsMissing, observationsRemoved };
  }

  private async updateSightingLifecycle(subId: string, data: Prisma.SightingUpdateManyMutationInput): Promise<void> {
    const linkedSightings = await prisma.sighting.findMany({
      where: { subId, incidentId: { not: null } },
      select: { incidentId: true, status: true },
    });
    const incidentIds = linkedSightings
      .filter(sighting => data.status !== undefined && sighting.status !== data.status)
      .map(sighting => sighting.incidentId!);

    await prisma.sighting.updateMany({
      where: { subId },
      data,
    });

    for (const incidentId of new Set(incidentIds)) {
      await reconcileIncidentFromPresentSightings(prisma, incidentId);
    }
  }

  private async writeShadowObservation(alertTargetId: string, observation: EbirdObservation, location: ResolvedObservationLocation, alertPollRunId: string | null, now: Date): Promise<void> {
    await prisma.alertTargetObservation.upsert({
      where: {
        alertTargetId_subId: {
          alertTargetId,
          subId: observation.subId,
        },
      },
      create: {
        alertTargetId,
        subId: observation.subId,
        locId: observation.locId,
        speciesCode: observation.speciesCode,
        commonName: observation.comName,
        scientificName: observation.sciName,
        locationName: location.locationName,
        obsDt: observation.obsDt,
        howMany: observation.howMany ?? null,
        latitude: observation.lat,
        longitude: observation.lng,
        displayCounty: location.county,
        displayState: location.state,
        displayCountry: location.country,
        locationResolutionSource: location.source,
        status: 'present',
        missingSince: null,
        missingPollCount: 0,
        removedAt: null,
        lastSeenInPollRunId: alertPollRunId,
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: {
        locId: observation.locId,
        speciesCode: observation.speciesCode,
        commonName: observation.comName,
        scientificName: observation.sciName,
        locationName: location.locationName,
        obsDt: observation.obsDt,
        howMany: observation.howMany ?? null,
        latitude: observation.lat,
        longitude: observation.lng,
        displayCounty: location.county,
        displayState: location.state,
        displayCountry: location.country,
        locationResolutionSource: location.source,
        status: 'present',
        missingSince: null,
        missingPollCount: 0,
        removedAt: null,
        lastSeenInPollRunId: alertPollRunId,
        lastSeenAt: now,
      },
    });

    await this.updateSightingLifecycle(observation.subId, {
      status: 'present',
      missingSince: null,
      missingPollCount: 0,
      removedAt: null,
    });
  }

  private async writeObservationsAsSightings(
    observations: EbirdObservation[],
    fallbackRegionName: string,
    regionCode: string,
  ): Promise<{ sightingsCreated: number; incidentsTouched: number }> {
    const subIds = observations.map(observation => observation.subId).filter(Boolean);
    const existing = await prisma.sighting.findMany({
      where: { subId: { in: subIds } },
      select: {
        subId: true,
        speciesCode: true,
        scientificName: true,
        incidentId: true,
      },
    });
    const scientificNames = [...new Set(observations.map(observation => observation.sciName).filter(Boolean))];
    const commonNames = [...new Set(observations.map(observation => observation.comName).filter(Boolean))];
    const rarityRecords = await prisma.rarityCode.findMany({
      where: {
        OR: [
          { scientificName: { in: scientificNames } },
          { commonName: { in: commonNames } },
        ],
      },
    });
    const rarityByScientificName = new Map(rarityRecords.map(record => [record.scientificName, record.abaCode]));
    const rarityByCommonName = new Map(rarityRecords.map(record => [record.commonName, record.abaCode]));
    let sightingsCreated = 0;
    let incidentsTouched = 0;

    for (const observation of observations) {
      if (!observation.subId) continue;
      const existingSighting = findExistingSightingForObservation(existing, observation);
      if (existingSighting) {
        if (existingSighting.incidentId) {
          const reopened = await reopenClosedIncident(
            prisma,
            existingSighting.incidentId,
            { name: fallbackRegionName, code: regionCode },
          );
          if (reopened) incidentsTouched++;
        }
        continue;
      }

      const location = await this.locationResolver.resolve(observation, fallbackRegionName);
      const sighting = await prisma.sighting.create({
        data: {
          species: observation.comName,
          scientificName: observation.sciName,
          location: location.locationName,
          date: observationDate(observation.obsDt),
          observer: observation.userDisplayName ?? '',
          rarity: rarityByScientificName.get(observation.sciName) ?? rarityByCommonName.get(observation.comName) ?? 0,
          latitude: observation.lat,
          longitude: observation.lng,
          subId: observation.subId,
          locId: observation.locId,
          speciesCode: observation.speciesCode,
          howMany: observation.howMany ?? null,
          displayCounty: location.county,
          displayState: location.state,
          displayCountry: location.country,
          locationResolutionSource: location.source,
        },
      });
      sightingsCreated++;

      const touched = await this.attachSightingToIncident(sighting, {
        name: fallbackRegionName,
        code: regionCode,
      });
      if (touched) incidentsTouched++;
    }

    return { sightingsCreated, incidentsTouched };
  }

  private async attachSightingToIncident(
    sighting: Sighting,
    pollRegion: { name: string; code: string },
  ): Promise<boolean> {
    if (sighting.latitude === null || sighting.longitude === null) return false;

    const scientificName = normalizeScientificName(sighting.scientificName || '', sighting.species);
    const matchingIncidents = await findMatchingIncident(prisma, scientificName, sighting.latitude, sighting.longitude, sighting.date);
    if (matchingIncidents.length > 0) {
      await addSightingToIncident(prisma, matchingIncidents, sighting, pollRegion);
    } else {
      await createIncident(prisma, {
        ...sighting,
        scientificName,
      }, pollRegion);
    }

    return true;
  }
}
