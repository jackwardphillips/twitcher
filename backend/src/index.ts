import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';
import { fileURLToPath } from 'url';
import { databaseProvider, prisma } from './lib/db.js';
import { IngestionService } from './lib/ingestion-service.js';
import type { IngestionResult } from './lib/ingestion-service.js';
import type { IngestionRun } from '@prisma/client';
import { ImapClient } from './lib/imap-client.js';
import { closeInactiveIncidents, getOpenIncidents, formatDate } from './lib/incident-service.js';
import { runSummarizationCycle } from './lib/summarization-service.js';
import { PhotoService } from './lib/photo-service.js';
import { getRarityStatsOptions, getStateRarityStats } from './lib/statistics-service.js';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3001;
const externalSideEffectsDisabled = process.env.DISABLE_EXTERNAL_SIDE_EFFECTS === 'true';

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://twitcher-sigma.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS'));
  }
}));

app.use(express.json());

const photoService = new PhotoService();
let ingestionInProgress = false;

async function triggerIngestion(enrich = true, trigger = 'manual'): Promise<IngestionResult> {
  if (ingestionInProgress) {
    const error = new Error('Ingestion already in progress');
    (error as Error & { statusCode?: number }).statusCode = 409;
    throw error;
  }

  ingestionInProgress = true;
  const imapConfig = {
    host: process.env.IMAP_HOST || '',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    user: process.env.IMAP_USER || '',
    pass: process.env.IMAP_PASS || '',
    secure: process.env.IMAP_SECURE !== 'false',
  };

  const imapClient = new ImapClient(imapConfig);
  const ingestionService = new IngestionService(imapClient);

  try {
    // Close inactive incidents before and after ingestion to ensure status is up to date
    await closeInactiveIncidents(prisma);
    const results = await ingestionService.ingest(undefined, enrich, trigger);
    await closeInactiveIncidents(prisma);

    // Trigger summarization cycle in the background if new data was ingested
    if (results.ingested > 0) {
      runSummarizationCycle(prisma).catch(err => {
        console.error('Background summarization cycle failed:', err);
      });
    }

    return results;
  } finally {
    ingestionInProgress = false;
  }
}

app.get('/health', (req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'rare-bird-dashboard-backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

app.get('/api/health', async (req: Request, res: Response) => {
  const started = Date.now();
  let database = { ok: false, latencyMs: 0 };
  let latestRun: IngestionRun | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = {
      ok: true,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    database = {
      ok: false,
      latencyMs: Date.now() - started,
    };
  }

  if (database.ok) {
    try {
      latestRun = await prisma.ingestionRun.findFirst({
        orderBy: { startedAt: 'desc' },
      });
    } catch (error) {
      latestRun = null;
    }
  }

  const ok = database.ok;
  res.status(ok ? 200 : 503).json({
    ok,
    database,
    ingestion: {
      startupIngestionEnabled: process.env.RUN_STARTUP_INGESTION === 'true',
      inProgress: ingestionInProgress,
      lastRunAt: latestRun?.finishedAt ?? latestRun?.startedAt ?? null,
      lastStatus: latestRun?.status ?? null,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV ?? 'development',
      databaseProvider,
      externalSideEffectsDisabled,
    },
  });
});

function sanitizeErrorMessage(message: string | undefined): string {
  if (!message) return 'An unknown error occurred';
  // Hide internal database details and specific library errors that leak paths
  if (message.includes('Prisma') || message.includes('DATABASE_URL') || message.includes('secret') || message.includes(' at ')) {
    return 'An unexpected internal error occurred';
  }
  return message;
}

app.post('/api/ingest', async (req: Request, res: Response) => {
  if (externalSideEffectsDisabled) {
    return res.status(403).json({
      error: 'Ingestion is disabled',
    });
  }

  try {
    console.log('Triggering ingestion via API...');
    const results = await triggerIngestion(true, 'api');
    console.log('Ingestion result:', results);
    
    if (results.status === 'imap_error' || results.status === 'error') {
      return res.status(500).json({ 
        error: 'Ingestion failed', 
        details: sanitizeErrorMessage(results.error) 
      });
    }
    
    res.json({ message: 'Ingestion complete', results });
  } catch (error) {
    console.error('Ingestion failed via API:', error);
    if (error instanceof Error && (error as Error & { statusCode?: number }).statusCode === 409) {
      return res.status(409).json({
        error: 'Ingestion already in progress',
      });
    }
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: 'Ingestion failed', 
      details: sanitizeErrorMessage(message) 
    });
  }
});

app.get('/api/ingest', (req: Request, res: Response) => {
  if (externalSideEffectsDisabled) {
    return res.status(403).json({
      error: 'Ingestion is disabled',
    });
  }

  if (ingestionInProgress) {
    return res.status(409).json({
      error: 'Ingestion already in progress',
    });
  }

  console.log('Triggering ingestion via cron...');
  void triggerIngestion(true, 'cron')
    .then(results => {
      console.log('Cron ingestion result:', results);
    })
    .catch(error => {
      console.error('Cron ingestion failed:', error);
    });

  res.status(202).json({
    message: 'Ingestion started',
  });
});

app.get('/api/ingestion-status', async (req: Request, res: Response) => {
  try {
    const lastEmail = await prisma.incomingEmail.findFirst({
      orderBy: { date: 'desc' },
      where: { 
        status: 'processed',
        from: 'ebird-alert@birds.cornell.edu'
      }
    });

    let latestRun: IngestionRun | null = null;
    try {
      latestRun = await prisma.ingestionRun.findFirst({
        orderBy: { startedAt: 'desc' },
      });
    } catch (error) {
      latestRun = null;
    }

    res.json({
      lastIngestedEmailDate: lastEmail?.date || null,
      inProgress: ingestionInProgress,
      startupIngestionEnabled: process.env.RUN_STARTUP_INGESTION === 'true',
      externalSideEffectsDisabled,
      latestRun,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ingestion status' });
  }
});

function parsePositiveInt(value: unknown, fallback: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), max);
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function topEntries(map: Map<string, number>, take = 10) {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, take);
}

app.get('/api/ops/enrichment-summary', async (req: Request, res: Response) => {
  try {
    const days = parsePositiveInt(req.query.days, 7, 30);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [attempts, apiCalls] = await Promise.all([
      prisma.enrichmentAttempt.findMany({
        where: { startedAt: { gte: since } },
        orderBy: { startedAt: 'desc' },
        take: 5000,
      }),
      prisma.ebirdApiCallLog.findMany({
        where: { startedAt: { gte: since } },
        orderBy: { startedAt: 'desc' },
        take: 5000,
      }),
    ]);

    const missedBySpecies = new Map<string, number>();
    const missedByRegion = new Map<string, number>();
    const rejectionReasons = new Map<string, number>();
    const apiErrorsByEndpoint = new Map<string, number>();
    const apiCallsByEndpoint = new Map<string, number>();

    let matched = 0;
    let missed = 0;
    let errored = 0;

    for (const attempt of attempts) {
      if (attempt.status === 'matched') {
        matched++;
        continue;
      }
      if (attempt.status === 'error') errored++;
      else missed++;

      increment(missedBySpecies, attempt.species);
      increment(missedByRegion, attempt.regionCode ?? 'unknown');
      increment(rejectionReasons, attempt.rejectionReason ?? attempt.status);
    }

    for (const call of apiCalls) {
      increment(apiCallsByEndpoint, call.endpoint);
      if (call.errorMessage || (call.httpStatus !== null && call.httpStatus >= 400)) {
        increment(apiErrorsByEndpoint, call.endpoint);
      }
    }

    res.json({
      window: {
        days,
        since: since.toISOString(),
      },
      totals: {
        enrichmentAttempts: attempts.length,
        matched,
        missed,
        errored,
        ebirdApiCalls: apiCalls.length,
      },
      topMissedSpecies: topEntries(missedBySpecies),
      topMissedRegions: topEntries(missedByRegion),
      topRejectionReasons: topEntries(rejectionReasons),
      apiCallsByEndpoint: topEntries(apiCallsByEndpoint),
      apiErrorsByEndpoint: topEntries(apiErrorsByEndpoint),
      examples: attempts
        .filter(attempt => attempt.status !== 'matched')
        .slice(0, 10)
        .map(attempt => ({
          id: attempt.id,
          species: attempt.species,
          location: attempt.location,
          sightingDate: attempt.sightingDate,
          strategy: attempt.strategy,
          regionCode: attempt.regionCode,
          status: attempt.status,
          rejectionReason: attempt.rejectionReason,
          apiCandidateCount: attempt.apiCandidateCount,
          speciesMatchCount: attempt.speciesMatchCount,
          timeWindowMatchCount: attempt.timeWindowMatchCount,
        })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch enrichment summary' });
  }
});

app.get('/api/ops/ingestion-runs/:id/logs', async (req: Request, res: Response) => {
  try {
    const run = await prisma.ingestionRun.findUnique({
      where: { id: String(req.params.id) },
      include: {
        emailAttempts: { orderBy: { startedAt: 'asc' } },
        enrichmentAttempts: { orderBy: { startedAt: 'asc' } },
        ebirdApiCallLogs: { orderBy: { startedAt: 'asc' } },
      },
    });

    if (!run) {
      return res.status(404).json({ error: 'Ingestion run not found' });
    }

    res.json(run);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ingestion run logs' });
  }
});

app.get('/api/ops/enrichment-logs', async (req: Request, res: Response) => {
  try {
    const days = parsePositiveInt(req.query.days, 7, 30);
    const limit = parsePositiveInt(req.query.limit, 100, 500);
    const since = req.query.since ? new Date(String(req.query.since)) : new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = await prisma.enrichmentAttempt.findMany({
      where: {
        startedAt: { gte: since },
        ...(req.query.species ? { species: { contains: String(req.query.species) } } : {}),
        ...(req.query.region ? { regionCode: String(req.query.region) } : {}),
        ...(req.query.status ? { status: String(req.query.status) } : {}),
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    res.json({ since: since.toISOString(), logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch enrichment logs' });
  }
});

app.get('/api/ops/ebird-api-calls', async (req: Request, res: Response) => {
  try {
    const days = parsePositiveInt(req.query.days, 7, 30);
    const limit = parsePositiveInt(req.query.limit, 100, 500);
    const since = req.query.since ? new Date(String(req.query.since)) : new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = await prisma.ebirdApiCallLog.findMany({
      where: {
        startedAt: { gte: since },
        ...(req.query.endpoint ? { endpoint: { contains: String(req.query.endpoint) } } : {}),
        ...(req.query.region ? {
          OR: [
            { endpoint: { contains: String(req.query.region) } },
            { paramsJson: { contains: String(req.query.region) } },
          ],
        } : {}),
        ...(req.query.status ? { httpStatus: Number.parseInt(String(req.query.status), 10) } : {}),
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    res.json({ since: since.toISOString(), logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch eBird API call logs' });
  }
});

app.get('/api/sightings', async (req: Request, res: Response) => {
  try {
    const requestedTake = Number.parseInt(String(req.query.take ?? '100'), 10);
    const take = Number.isFinite(requestedTake) ? Math.min(Math.max(requestedTake, 1), 100) : 100;
    const requestedPage = Number.parseInt(String(req.query.page ?? '1'), 10);
    const page = Number.isFinite(requestedPage) ? Math.max(requestedPage, 1) : 1;

    const sightings = await prisma.sighting.findMany({
      where: { status: 'present' },
      orderBy: { date: 'desc' },
      take,
      skip: (page - 1) * take,
    });

    // Calculate streaks in memory for all sightings
    // Group by (species, location)
    const grouped: Record<string, string[]> = {};
    for (const s of sightings) {
      const key = `${s.species}|${s.location}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(formatDate(s.date));
    }

    // Convert grouped dates to unique sorted sets
    const streakData: Record<string, string[]> = {};
    for (const key in grouped) {
      streakData[key] = Array.from(new Set(grouped[key])).sort().reverse();
    }

    const sightingsWithStreaks = sightings.map(s => {
      const key = `${s.species}|${s.location}`;
      const dates = streakData[key];
      const refDateStr = formatDate(s.date);
      
      let streak = 0;
      let currentDate = new Date(`${refDateStr}T12:00:00`);
      
      while (dates) {
        const dateStr = formatDate(currentDate);
        if (dates.includes(dateStr)) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      return { ...s, streak, date: refDateStr };
    });

    res.json(sightingsWithStreaks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sightings' });
  }
});

app.get('/api/incidents', async (req: Request, res: Response) => {
  try {
    const incidents = await getOpenIncidents(prisma);

    // Lazy fetch missing/stale photos in the background
    if (!externalSideEffectsDisabled) {
      incidents.forEach(incident => {
        photoService.needsFetch(incident.scientificName)
          .then(needed => {
            if (needed) {
              return photoService.fetchSpeciesPhoto(incident.scientificName);
            }
          })
          .catch(err => {
            console.error(`Background photo check/fetch failed for ${incident.scientificName}:`, err);
          });
      });
    }

    res.json(incidents);
  } catch (error) {
    console.error('Failed to fetch incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

app.get('/api/statistics/state-rarities', async (req: Request, res: Response) => {
  try {
    const groupBy = req.query.groupBy === 'state' ? 'state' : 'county';
    const state = typeof req.query.state === 'string' && req.query.state.trim() ? req.query.state.trim() : undefined;
    const active = req.query.year === 'active';
    const requestedYear = Number.parseInt(String(req.query.year ?? ''), 10);
    const year = !active && Number.isFinite(requestedYear) ? requestedYear : undefined;
    const filters = {
      ...(state ? { state } : {}),
      ...(year ? { year } : {}),
      ...(active ? { active } : {}),
    };
    const stats = await getStateRarityStats(prisma, groupBy, filters);
    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch state rarity statistics:', error);
    res.status(500).json({ error: 'Failed to fetch state rarity statistics' });
  }
});

app.get('/api/statistics/state-rarities/options', async (req: Request, res: Response) => {
  try {
    const options = await getRarityStatsOptions(prisma);
    res.json(options);
  } catch (error) {
    console.error('Failed to fetch state rarity statistic options:', error);
    res.status(500).json({ error: 'Failed to fetch state rarity statistic options' });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);

    if (process.env.RUN_STARTUP_INGESTION === 'true' && !externalSideEffectsDisabled) {
      console.log('Running startup email ingestion...');
      try {
        const results = await triggerIngestion(true, 'startup');
        console.log(`Startup ingestion complete: ${results.status} (enrichment: ${results.enrichmentStatus})`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Startup ingestion failed:', message);
      }
    } else {
      console.log('Startup ingestion disabled.');
    }
  });
}

export { app };
