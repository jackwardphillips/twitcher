import { prisma } from './db.js';
import type { EbirdObservation } from './ebird-client.js';

export interface EnrichmentLoggingContext {
  ingestionRunId?: string;
  emailAttemptId?: string;
  enrichmentAttemptId?: string;
  alertPollRunId?: string;
  alertTargetPollAttemptId?: string;
}

export interface MatchDiagnostics {
  match: EbirdObservation | null;
  apiCandidateCount: number;
  speciesMatchCount: number;
  timeWindowMatchCount: number;
  rejectionReason?: string;
}

export function sanitizeLogError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/DATABASE_URL|postgresql:\/\/|password|secret|x-ebirdapitoken|Prisma| at /i.test(message)) {
    return 'An unexpected internal error occurred';
  }
  return message.slice(0, 1000);
}

export function summarizeParsedSightings(sightings: Array<{ species: string; location: string; date: Date }>): string {
  return JSON.stringify(sightings.map(sighting => ({
    species: sighting.species,
    location: sighting.location,
    date: sighting.date.toISOString(),
  })));
}

export async function pruneOldEnrichmentLogs(days = 30): Promise<void> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await prisma.ebirdApiCallLog.deleteMany({ where: { startedAt: { lt: cutoff } } });
  await prisma.enrichmentAttempt.deleteMany({ where: { startedAt: { lt: cutoff } } });
  await prisma.emailIngestionAttempt.deleteMany({ where: { startedAt: { lt: cutoff } } });
}

export async function createEmailAttempt(data: {
  ingestionRunId: string;
  incomingEmailId?: number | null;
  messageId: string;
  subject?: string | null;
  from?: string | null;
  emailDate?: Date | null;
  source: string;
  status?: string;
}) {
  return prisma.emailIngestionAttempt.create({
    data: {
      ingestionRunId: data.ingestionRunId,
      incomingEmailId: data.incomingEmailId ?? null,
      messageId: data.messageId,
      subject: data.subject ?? null,
      from: data.from ?? null,
      emailDate: data.emailDate ?? null,
      source: data.source,
      status: data.status ?? 'started',
    },
  });
}

export async function finishEmailAttempt(id: string, data: {
  status: string;
  incomingEmailId?: number | null;
  parsedSightings?: number;
  parsedSummary?: string | null;
  errorMessage?: string | null;
}) {
  const updateData: Record<string, unknown> = {
    status: data.status,
    errorMessage: data.errorMessage ?? null,
    finishedAt: new Date(),
  };
  if (data.incomingEmailId !== undefined) updateData.incomingEmailId = data.incomingEmailId;
  if (data.parsedSightings !== undefined) updateData.parsedSightings = data.parsedSightings;
  if (data.parsedSummary !== undefined) updateData.parsedSummary = data.parsedSummary;

  await prisma.emailIngestionAttempt.update({
    where: { id },
    data: updateData,
  });
}

export async function createEnrichmentAttempt(context: EnrichmentLoggingContext, data: {
  sightingId?: number | null;
  species: string;
  location: string;
  sightingDate: Date;
}) {
  return prisma.enrichmentAttempt.create({
    data: {
      ingestionRunId: context.ingestionRunId ?? null,
      emailAttemptId: context.emailAttemptId ?? null,
      sightingId: data.sightingId ?? null,
      species: data.species,
      location: data.location,
      sightingDate: data.sightingDate,
      status: 'started',
    },
  });
}

export async function finishEnrichmentAttempt(id: string, data: {
  status: string;
  strategy?: string | null;
  regionCode?: string | null;
  diagnostics?: MatchDiagnostics;
  errorMessage?: string | null;
}) {
  await prisma.enrichmentAttempt.update({
    where: { id },
    data: {
      status: data.status,
      strategy: data.strategy ?? null,
      regionCode: data.regionCode ?? null,
      rejectionReason: data.diagnostics?.rejectionReason ?? null,
      apiCandidateCount: data.diagnostics?.apiCandidateCount ?? 0,
      speciesMatchCount: data.diagnostics?.speciesMatchCount ?? 0,
      timeWindowMatchCount: data.diagnostics?.timeWindowMatchCount ?? 0,
      selectedSubId: data.diagnostics?.match?.subId ?? null,
      selectedSpecies: data.diagnostics?.match?.comName ?? null,
      selectedLocation: data.diagnostics?.match?.locName ?? null,
      selectedObsDt: data.diagnostics?.match?.obsDt ?? null,
      errorMessage: data.errorMessage ?? null,
      finishedAt: new Date(),
    },
  });
}
