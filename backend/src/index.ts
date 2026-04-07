import express from 'express';
import type { Request, Response } from 'express';
import { fileURLToPath } from 'url';
import { prisma } from './lib/db.js';
import { IngestionService } from './lib/ingestion-service.js';
import { ImapClient } from './lib/imap-client.js';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Rare Bird Dashboard API is running' });
});

app.post('/api/ingest', async (req: Request, res: Response) => {
  try {
    const imapConfig = {
      host: process.env.IMAP_HOST || '',
      port: parseInt(process.env.IMAP_PORT || '993', 10),
      user: process.env.IMAP_USER || '',
      pass: process.env.IMAP_PASS || '',
      secure: process.env.IMAP_SECURE !== 'false',
    };

    const imapClient = new ImapClient(imapConfig);
    const ingestionService = new IngestionService(imapClient);
    
    console.log('Triggering ingestion via API...');
    const results = await ingestionService.ingest();
    console.log('Ingestion result:', results);
    res.json({ message: 'Ingestion complete', results });
  } catch (error) {
    console.error('Ingestion failed via API:', error);
    res.status(500).json({ error: 'Ingestion failed', details: error instanceof Error ? error.message : String(error) });
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
      grouped[key].push(s.date.toISOString().split('T')[0]);
    }

    // Convert grouped dates to unique sorted sets
    const streakData: Record<string, string[]> = {};
    for (const key in grouped) {
      streakData[key] = Array.from(new Set(grouped[key])).sort().reverse();
    }

    const sightingsWithStreaks = sightings.map(s => {
      const key = `${s.species}|${s.location}`;
      const dates = streakData[key];
      const refDateStr = s.date.toISOString().split('T')[0];
      
      let streak = 0;
      let currentDate = new Date(refDateStr);
      
      while (true) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (dates.includes(dateStr)) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      return { ...s, streak };
    });

    res.json(sightingsWithStreaks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sightings' });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

export { app };

