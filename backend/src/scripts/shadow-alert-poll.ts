import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../lib/db.js';
import { EbirdClient } from '../lib/ebird-client.js';
import { AlertTargetService } from '../lib/alert-target-service.js';
import { ImapClient } from '../lib/imap-client.js';
import { IngestionService } from '../lib/ingestion-service.js';
import { validateProductionPollerEnvironment } from '../lib/poller-runtime.js';
import { runSummarizationCycle } from '../lib/summarization-service.js';

interface PollTarget {
  id: string;
  speciesName: string;
  speciesCode: string | null;
  regionName: string;
  regionCode: string;
  expectedReports: number;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getNumberArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const arg = process.argv.find(value => value.startsWith(prefix));
  if (!arg) return fallback;
  const value = Number(arg.slice(prefix.length));
  return Number.isFinite(value) ? value : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function getImapClient(): ImapClient {
  return new ImapClient({
    host: process.env.IMAP_HOST || '',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    user: process.env.IMAP_USER || '',
    pass: process.env.IMAP_PASS || '',
    secure: process.env.IMAP_SECURE !== 'false',
  });
}

async function ingestAlertEmails() {
  const ingestionService = new IngestionService(getImapClient());
  return ingestionService.ingest(undefined, false, 'poller', { writeParsedSightings: false });
}

async function getActiveTargets(limit: number): Promise<PollTarget[]> {
  return prisma.alertTarget.findMany({
    where: { status: 'active' },
    select: {
      id: true,
      speciesName: true,
      speciesCode: true,
      regionName: true,
      regionCode: true,
      expectedReports: true,
    },
    orderBy: [
      { lastPolledAt: 'asc' },
      { lastSeenInEmailAt: 'desc' },
    ],
    take: limit,
  });
}

async function main() {
  const emailLimit = getNumberArg('emails', 3);
  const targetLimit = getNumberArg('targets', 25);
  const back = getNumberArg('back', 3);
  const writeShadow = hasFlag('write-shadow');
  const writeSightings = hasFlag('write-sightings');
  const seedReferences = hasFlag('seed-references');
  const skipIngestion = hasFlag('skip-ingestion');

  if (writeSightings && !writeShadow) {
    throw new Error('--write-sightings requires --write-shadow');
  }
  validateProductionPollerEnvironment(writeSightings);

  const service = new AlertTargetService(new EbirdClient(process.env.EBIRD_API_KEY || ''));
  const ingestionResult = skipIngestion ? null : await ingestAlertEmails();
  if (ingestionResult) {
    console.log(`ingestion status=${ingestionResult.status} emailsFound=${ingestionResult.emailsFound} ingested=${ingestionResult.ingested} skipped=${ingestionResult.skipped} failed=${ingestionResult.failed}`);
    if (ingestionResult.status === 'imap_error' || ingestionResult.status === 'error') {
      throw new Error(`email ingestion failed: ${ingestionResult.error ?? ingestionResult.status}`);
    }
  }

  if (seedReferences) {
    const referencesDir = path.resolve(__dirname, '../../../references');
    const files = fs.readdirSync(referencesDir).filter(file => file.endsWith('.eml'));

    for (const file of files) {
      const filePath = path.join(referencesDir, file);
      const rawBody = fs.readFileSync(filePath, 'utf-8');
      await prisma.incomingEmail.upsert({
        where: { messageId: `local-reference:${file}` },
        create: {
          messageId: `local-reference:${file}`,
          subject: file,
          from: 'local-reference',
          date: new Date(),
          rawBody,
          status: 'processed',
        },
        update: {
          rawBody,
          status: 'processed',
          date: new Date(),
        },
      });
    }

    console.log(`seeded ${files.length} reference emails`);
  }

  let targets: PollTarget[];
  if (ingestionResult?.status === 'no_new_emails') {
    targets = await getActiveTargets(targetLimit);
    console.log(`no new emails; polling ${targets.length} active targets`);
  } else {
    const emails = await prisma.incomingEmail.findMany({
      where: { status: 'processed' },
      orderBy: { date: 'desc' },
      take: emailLimit,
    });

    const targetMap = new Map<string, PollTarget>();

    for (const email of emails) {
      const parsed = service.parseTargetsFromEmail(email.rawBody);
      console.log(`email ${email.id}: ${parsed.length} summary targets`);

      if (writeShadow) {
        const saved = await service.upsertTargetsFromEmail(email.rawBody, email.id, email.date ?? new Date());
        for (const target of saved) {
          targetMap.set(target.id, {
            id: target.id,
            speciesName: target.speciesName,
            speciesCode: target.speciesCode,
            regionName: target.regionName,
            regionCode: target.regionCode,
            expectedReports: target.expectedReports,
          });
        }
      } else {
        for (const target of parsed) {
          const id = `${target.speciesName}|${target.regionCode}`;
          targetMap.set(id, {
            id,
            speciesName: target.speciesName,
            speciesCode: null,
            regionName: target.regionName,
            regionCode: target.regionCode,
            expectedReports: target.expectedReports,
          });
        }
      }
    }

    targets = Array.from(targetMap.values()).slice(0, targetLimit);
    console.log(`new/pending emails found; polling ${targets.length} targets from latest ${emails.length} processed emails`);
  }
  const mode = writeSightings ? 'write-sightings' : writeShadow ? 'write-shadow' : 'dry-run';
  let pollRunId: string | undefined;

  if (writeShadow) {
    const pollRun = await prisma.alertPollRun.create({
      data: {
        status: 'running',
        mode,
        backDays: back,
      },
    });
    pollRunId = pollRun.id;
    console.log(`pollRunId=${pollRun.id}`);
  }

  console.log(`polling ${targets.length} targets, back=${back}, mode=${mode}, writeSightings=${writeSightings}`);

  const results = [];
  try {
    for (const target of targets) {
      const result = await service.pollTarget(target, {
        back,
        dryRun: !writeShadow,
        writeSightings,
        alertPollRunId: pollRunId,
      });
      results.push(result);
      console.log(`${result.status.padEnd(20)} ${target.speciesName} / ${target.regionName} (${target.regionCode}) expected=${target.expectedReports} ebird=${result.observationsFound} missing=${result.observationsMissing} removed=${result.observationsRemoved} restored=${result.observationsRestored}`);
    }
  } catch (error) {
    if (pollRunId) {
      await prisma.alertPollRun.update({
        where: { id: pollRunId },
        data: {
          status: 'error',
          finishedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    }
    throw error;
  }

  const totals = results.reduce((acc, result, index) => {
    acc.observationsFound += result.observationsFound;
    acc.shadowObservationsWritten += result.shadowObservationsWritten;
    acc.sightingsCreated += result.sightingsCreated;
    acc.incidentsTouched += result.incidentsTouched;
    acc.observationsMissing += result.observationsMissing;
    acc.observationsRemoved += result.observationsRemoved;
    acc.observationsRestored += result.observationsRestored;
    acc.expectedReports += targets[index]?.expectedReports ?? 0;
    if (result.observationsFound === 0) acc.zeroObservationTargets++;
    if (result.status !== 'success') acc.failed++;
    return acc;
  }, {
    expectedReports: 0,
    observationsFound: 0,
    shadowObservationsWritten: 0,
    sightingsCreated: 0,
    incidentsTouched: 0,
    observationsMissing: 0,
    observationsRemoved: 0,
    observationsRestored: 0,
    zeroObservationTargets: 0,
    failed: 0,
  });

  const summarization = writeSightings
    ? await runSummarizationCycle(prisma)
    : { eligible: 0, updated: 0, skipped: 0, failed: 0 };
  const apiCounts = pollRunId
    ? {
        attempts: await prisma.ebirdApiCallLog.count({ where: { alertPollRunId: pollRunId } }),
        failures: await prisma.ebirdApiCallLog.count({
          where: {
            alertPollRunId: pollRunId,
            OR: [{ httpStatus: { gte: 400 } }, { errorMessage: { not: null } }],
          },
        }),
      }
    : { attempts: 0, failures: 0 };
  const partialFailure = totals.failed > 0 || summarization.failed > 0;

  if (pollRunId) {
    await prisma.alertPollRun.update({
      where: { id: pollRunId },
      data: {
        status: partialFailure ? 'partial_failure' : 'success',
        finishedAt: new Date(),
        targetsPolled: results.length,
        totalExpectedReports: totals.expectedReports,
        totalObservationsFound: totals.observationsFound,
        zeroObservationTargets: totals.zeroObservationTargets,
      },
    });
  }

  console.log('--- Summary ---');
  console.log(JSON.stringify(totals, null, 2));
  console.log(`POLLER_RESULT_JSON=${JSON.stringify({
    schemaVersion: 1,
    status: partialFailure ? 'partial_failure' : 'success',
    ingestion: ingestionResult ? {
      status: ingestionResult.status,
      emailsFound: ingestionResult.emailsFound,
      ingested: ingestionResult.ingested,
      skipped: ingestionResult.skipped,
      failed: ingestionResult.failed,
    } : null,
    targets: { attempted: results.length, failed: totals.failed },
    ebirdHttp: apiCounts,
    summarization: {
      status: summarization.failed > 0 ? 'partial_failure' : 'success',
      ...summarization,
    },
    alertPollRunId: pollRunId ?? null,
  })}`);
  if (partialFailure) {
    throw new Error('Production poller completed with partial failures');
  }
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
