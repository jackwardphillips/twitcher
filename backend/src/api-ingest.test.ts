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
    const mockResult = { 
      ingested: 2, 
      skipped: 1, 
      failed: 0,
      status: 'success',
      enrichmentStatus: 'success'
    };
    (IngestionService.prototype.ingest as any).mockResolvedValue(mockResult);

    const response = await request(app).post('/api/ingest');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Ingestion complete',
      results: mockResult
    });
    expect(IngestionService.prototype.ingest).toHaveBeenCalled();
  });

  it('should return 500 if status is imap_error', async () => {
    const mockResult = { status: 'imap_error', error: 'Connection failed', ingested: 0, skipped: 0, failed: 0 };
    (IngestionService.prototype.ingest as any).mockResolvedValue(mockResult);

    const response = await request(app).post('/api/ingest');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ 
      error: 'Ingestion failed',
      details: 'Connection failed'
    });
  });

  it('should return 500 if ingestion throws an exception', async () => {
    (IngestionService.prototype.ingest as any).mockRejectedValue(new Error('Hard crash'));

    const response = await request(app).post('/api/ingest');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ 
      error: 'Ingestion failed',
      details: 'Hard crash'
    });
  });

  describe('Hardening Gaps', () => {
    it('should return 500 on IMAP auth failure with clean message', async () => {
      (IngestionService.prototype.ingest as any).mockResolvedValue({
        status: 'imap_error',
        error: 'Invalid credentials',
        ingested: 0, skipped: 0, failed: 0
      });

      const response = await request(app).post('/api/ingest');
      expect(response.status).toBe(500);
      expect(response.body.details).toBe('Invalid credentials');
    });

    it('should return 200 even if enrichment hits rate limits (partial success)', async () => {
      (IngestionService.prototype.ingest as any).mockResolvedValue({
        status: 'success',
        enrichmentStatus: 'failed',
        error: 'eBird API error 429: Too Many Requests',
        ingested: 3, skipped: 0, failed: 0
      });

      const response = await request(app).post('/api/ingest');
      expect(response.status).toBe(200);
      expect(response.body.results.enrichmentStatus).toBe('failed');
      expect(response.body.results.error).toContain('429');
    });

    it('should return 500 on IMAP connection timeout', async () => {
      (IngestionService.prototype.ingest as any).mockResolvedValue({
        status: 'imap_error',
        error: 'Connection timed out',
        ingested: 0, skipped: 0, failed: 0
      });

      const response = await request(app).post('/api/ingest');
      expect(response.status).toBe(500);
      expect(response.body.details).toBe('Connection timed out');
    });

    it('should sanitize generic error messages to avoid leaking internals', async () => {
      const sensitiveError = new Error('PrismaClientKnownRequestError: Unique constraint failed on the fields: (`messageId`) at ...');
      (IngestionService.prototype.ingest as any).mockRejectedValue(sensitiveError);

      const response = await request(app).post('/api/ingest');
      expect(response.status).toBe(500);
      // We expect a sanitized message for internal errors
      expect(response.body.details).toBe('An unexpected internal error occurred');
    });
  });
});
