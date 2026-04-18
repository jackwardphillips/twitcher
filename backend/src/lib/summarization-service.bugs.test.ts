import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { summarizeIncident } from './summarization-service';

// Mock Prisma
const prismaMock = {
  sighting: {
    findMany: vi.fn(),
  },
  incident: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
};

describe('SummarizationService Bugs', () => {
  let originalFetch: any;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T10:00:00Z'));
    originalFetch = global.fetch;
    process.env.GEMINI_API_KEY = 'test-gemini-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('should re-summarize even if already summarized today (BUG FIX)', async () => {
    const mockIncident = { 
      id: 'inc-1', 
      geminiSummary: 'Today summary', 
      summaryGeneratedAt: new Date('2026-04-20T08:00:00Z') // Same day
    };
    prismaMock.incident.findUnique.mockResolvedValue(mockIncident);
    prismaMock.sighting.findMany.mockResolvedValue([
      { details: 'Even newer info' }
    ]);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Updated summary same day' }] } }]
      })
    });

    await summarizeIncident(prismaMock as any, 'inc-1');

    // Currently it should FAIL (not call update) until I fix it
    expect(prismaMock.incident.update).toHaveBeenCalledWith({
      where: { id: 'inc-1' },
      data: {
        geminiSummary: 'Updated summary same day',
        summaryGeneratedAt: new Date('2026-04-20T10:00:00Z'),
      }
    });
  });
});
