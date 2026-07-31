import type { PrismaClient } from '@prisma/client';
import { EnrichmentService } from './enrichment-service.js';

export interface PollTargetDraft {
  speciesName: string;
  regionName: string;
  regionCode: string;
  expectedReports: number;
}

export interface CatchupEmail {
  id: number;
  date: Date | null;
  rawBody: string;
}

export interface CatchupEmailBatch {
  selected: CatchupEmail[];
  observedIds: number[];
}

const EMAIL_LOOKBACK_DAYS = 5;
const EMAIL_LIMIT = 3;

function targetKey(target: Pick<PollTargetDraft, 'speciesName' | 'regionCode'>): string {
  return `${target.speciesName.toLowerCase().replace(/\s+/g, ' ').trim()}|${target.regionCode}`;
}

export function dedupePollTargetDrafts(targets: PollTargetDraft[]): PollTargetDraft[] {
  const deduped = new Map<string, PollTargetDraft>();
  for (const target of targets) {
    const key = targetKey(target);
    const existing = deduped.get(key);
    if (!existing || target.expectedReports > existing.expectedReports) {
      deduped.set(key, target);
    }
  }
  return Array.from(deduped.values());
}

export async function getCatchupEmailBatch(
  prisma: Pick<PrismaClient, 'incomingEmail'>,
  now = new Date(),
): Promise<CatchupEmailBatch> {
  const cutoff = new Date(now.getTime() - EMAIL_LOOKBACK_DAYS * 86400000);
  const observed = await prisma.incomingEmail.findMany({
    where: {
      status: 'processed',
      pollTargetsHandledAt: null,
      date: { gte: cutoff },
    },
    select: {
      id: true,
      date: true,
      rawBody: true,
    },
    orderBy: [
      { date: 'desc' },
      { id: 'desc' },
    ],
  });

  return {
    selected: observed.slice(0, EMAIL_LIMIT),
    observedIds: observed.map(email => email.id),
  };
}

export async function markCatchupEmailsHandled(
  prisma: Pick<PrismaClient, 'incomingEmail'>,
  observedIds: number[],
  handledAt = new Date(),
): Promise<void> {
  if (observedIds.length === 0) return;
  await prisma.incomingEmail.updateMany({
    where: {
      id: { in: observedIds },
      pollTargetsHandledAt: null,
    },
    data: {
      pollTargetsHandledAt: handledAt,
    },
  });
}

export async function commitCatchupEmailBatch(
  prisma: Pick<PrismaClient, 'incomingEmail'>,
  observedIds: number[],
  pollSucceeded: boolean,
  handledAt = new Date(),
): Promise<void> {
  if (!pollSucceeded) return;
  await markCatchupEmailsHandled(prisma, observedIds, handledAt);
}

export async function getOpenIncidentTargetDrafts(
  prisma: Pick<PrismaClient, 'incident'>,
): Promise<{ targets: PollTargetDraft[]; unresolvedIncidentIds: string[] }> {
  const incidents = await prisma.incident.findMany({
    where: { status: 'OPEN' },
    select: {
      id: true,
      commonName: true,
      pollRegionName: true,
      pollRegionCode: true,
      primaryState: true,
      primaryCountry: true,
    },
  });

  const targets: PollTargetDraft[] = [];
  const unresolvedIncidentIds: string[] = [];
  for (const incident of incidents) {
    const legacyRegion = [incident.primaryState, incident.primaryCountry]
      .filter((value): value is string => !!value)
      .map(name => ({ name, code: EnrichmentService.getRegionCode(name) }))
      .find(region => !!region.code);
    const regionName = incident.pollRegionName ?? legacyRegion?.name ?? null;
    const regionCode = incident.pollRegionCode ?? legacyRegion?.code ?? null;
    if (!regionName || !regionCode) {
      unresolvedIncidentIds.push(incident.id);
      continue;
    }
    targets.push({
      speciesName: incident.commonName,
      regionName,
      regionCode,
      expectedReports: 0,
    });
  }

  return {
    targets: dedupePollTargetDrafts(targets),
    unresolvedIncidentIds,
  };
}
