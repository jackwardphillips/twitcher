import express from 'express';
import type { Request, Response } from 'express';
import { fileURLToPath } from 'url';
import { prisma } from './lib/db.js';
import { IngestionService } from './lib/ingestion-service.js';
import type { IngestionResult } from './lib/ingestion-service.js';
import { ImapClient } from './lib/imap-client.js';
import { closeInactiveIncidents, getOpenIncidents, formatDate } from './lib/incident-service.js';
import { runSummarizationCycle } from './lib/summarization-service.js';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

let lastIngestionResult: IngestionResult | null = null;

async function triggerIngestion(enrich = true): Promise<IngestionResult> {
  const imapConfig = {
    host: process.env.IMAP_HOST || '',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    user: process.env.IMAP_USER || '',
    pass: process.env.IMAP_PASS || '',
    secure: process.env.IMAP_SECURE !== 'false',
  };

  const imapClient = new ImapClient(imapConfig);
  const ingestionService = new IngestionService(imapClient);
  
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
}

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Rare Bird Dashboard API is running' });
});

app.post('/api/ingest', async (req: Request, res: Response) => {
  try {
    console.log('Triggering ingestion via API...');
    const results = await triggerIngestion();
    console.log('Ingestion result:', results);
    res.json({ message: 'Ingestion complete', results });
  } catch (error) {
    console.error('Ingestion failed via API:', error);
    res.status(500).json({ error: 'Ingestion failed', details: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/ingestion-status', async (req: Request, res: Response) => {
  try {
    const lastEmail = await prisma.incomingEmail.findFirst({
      orderBy: { date: 'desc' },
      where: { status: 'processed' }
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
    const sightings = await prisma.sighting.findMany({
      orderBy: { date: 'desc' },
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
      
      while (true) {
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
    res.json(incidents);
  } catch (error) {
    console.error('Failed to fetch incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);
    
    // Trigger ingestion on startup
    console.log('Running startup email ingestion...');
    try {
      const results = await triggerIngestion();
      console.log(`Startup ingestion complete: ${results.status} (enrichment: ${results.enrichmentStatus})`);
    } catch (error) {
      console.error('Startup ingestion failed:', error);
    }
  });
}

export { app };
