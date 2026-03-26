import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Rare Bird Dashboard API is running' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
