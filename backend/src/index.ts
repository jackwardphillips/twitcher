import express from 'express';
import type { Request, Response } from 'express';
import { fileURLToPath } from 'url';
import prisma from './lib/db.js';

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
    res.json(sightings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sightings' });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

export default app;
