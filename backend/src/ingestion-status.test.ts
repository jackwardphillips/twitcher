import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from './index';
import { prisma } from './lib/db';

vi.mock('./lib/db', () => ({
  prisma: {
    incomingEmail: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    sighting: {
      findMany: vi.fn(),
    }
  },
}));

describe('Ingestion Status API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null if no emails have been ingested', async () => {
    (prisma.incomingEmail.findFirst as any).mockResolvedValue(null);

    const response = await request(app).get('/api/ingestion-status');
    expect(response.status).toBe(200);
    expect(response.body.lastIngestedEmailDate).toBeNull();
    expect(response.body.lastRun).toBeNull();
  });

  it('should return the date of the last ingested email and filter by ebird address', async () => {
    const mockDate = new Date('2026-04-01T12:00:00Z');
    (prisma.incomingEmail.findFirst as any).mockResolvedValue({
      date: mockDate,
    });

    const response = await request(app).get('/api/ingestion-status');
    expect(response.status).toBe(200);
    expect(new Date(response.body.lastIngestedEmailDate).toISOString()).toBe(mockDate.toISOString());
    expect(prisma.incomingEmail.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        from: 'ebird-alert@birds.cornell.edu'
      })
    }));
  });
});
