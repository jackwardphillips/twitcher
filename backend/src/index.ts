import express from 'express';
import type { Request, Response } from 'express';
import { fileURLToPath } from 'url';
import { prisma } from './lib/db.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Rare Bird Dashboard API is running' });
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

