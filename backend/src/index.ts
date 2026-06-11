import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';
import { fileURLToPath } from 'url';
import { prisma } from './lib/db.js';
import { IngestionService } from './lib/ingestion-service.js';
import type { IngestionResult } from './lib/ingestion-service.js';
import { ImapClient } from './lib/imap-client.js';
import { closeInactiveIncidents, getOpenIncidents, formatDate } from './lib/incident-service.js';
import { runSummarizationCycle } from './lib/summarization-service.js';
import { PhotoService } from './lib/photo-service.js';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
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

let lastIngestionResult: IngestionResult | null = null;
const photoService = new PhotoService();
let ingestionInProgress = false;

async function triggerIngestion(enrich = true): Promise<IngestionResult> {
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
    const results = await ingestionService.ingest(undefined, enrich);
    await closeInactiveIncidents(prisma);

    // Trigger summarization cycle in the background if new data was ingested
    if (results.ingested > 0) {
      runSummarizationCycle(prisma).catch(err => {
        console.error('Background summarization cycle failed:', err);
      });
    }

    lastIngestionResult = results;
    return results;
  } finally {
    ingestionInProgress = false;
  }
}

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Rare Bird Dashboard API is running' });
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
  try {
    console.log('Triggering ingestion via API...');
    const results = await triggerIngestion();
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

app.get('/api/ingestion-status', async (req: Request, res: Response) => {
  try {
    const lastEmail = await prisma.incomingEmail.findFirst({
      orderBy: { date: 'desc' },
      where: { 
        status: 'processed',
        from: 'ebird-alert@birds.cornell.edu'
      }
    });

    res.json({
      lastIngestedEmailDate: lastEmail?.date || null,
      lastRun: lastIngestionResult,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ingestion status' });
  }
});

app.get('/api/sightings', async (req: Request, res: Response) => {
  try {
    const requestedTake = Number.parseInt(String(req.query.take ?? '100'), 10);
    const take = Number.isFinite(requestedTake) ? Math.min(Math.max(requestedTake, 1), 100) : 100;
    const requestedPage = Number.parseInt(String(req.query.page ?? '1'), 10);
    const page = Number.isFinite(requestedPage) ? Math.max(requestedPage, 1) : 1;

    const sightings = await prisma.sighting.findMany({
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
    const incidents = await getOpenIncidents(prisma, 25);
    
    // Lazy fetch missing/stale photos in the background
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

    res.json(incidents);
  } catch (error) {
    console.error('Failed to fetch incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);

    if (process.env.RUN_STARTUP_INGESTION === 'true') {
      console.log('Running startup email ingestion...');
      try {
        const results = await triggerIngestion();
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
