import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import { IngestionService } from './lib/ingestion-service.js';

vi.mock('./lib/ingestion-service.js');

describe('POST /api/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger ingestion and return results', async () => {
    const mockResult = { ingested: 2, skipped: 1, failed: 0 };
    (IngestionService.prototype.ingest as any).mockResolvedValue(mockResult);

    const response = await request(app).post('/api/ingest');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Ingestion complete',
      results: mockResult
    });
    expect(IngestionService.prototype.ingest).toHaveBeenCalled();
  });

  it('should return 500 if ingestion fails', async () => {
    (IngestionService.prototype.ingest as any).mockRejectedValue(new Error('IMAP failure'));

    const response = await request(app).post('/api/ingest');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Ingestion failed' });
  });
});
