import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runSummarizationCycle, summarizeIncident } from './summarization-service.js';

describe('production summarization results', () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-key';
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports a provider failure instead of silently claiming success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const prisma = {
      incident: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'incident-1',
          geminiSummary: 'old',
          summaryGeneratedAt: null,
          lastSeen: new Date(),
        }),
      },
      sighting: {
        findMany: vi.fn().mockResolvedValue([{ details: 'near the north trail' }]),
      },
    };

    await expect(summarizeIncident(prisma as any, 'incident-1'))
      .rejects.toThrow('All configured incident summarization providers failed');
  });

  it('returns failed counts after awaiting all eligible incidents', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const prisma = {
      incident: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'incident-1',
          commonName: 'Ruff',
          geminiSummary: 'old',
          summaryGeneratedAt: null,
          lastSeen: new Date(),
          sightings: [],
        }]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'incident-1',
          geminiSummary: 'old',
          summaryGeneratedAt: null,
          lastSeen: new Date(),
        }),
      },
      sighting: {
        findMany: vi.fn().mockResolvedValue([{ details: 'near the north trail' }]),
      },
    };

    await expect(runSummarizationCycle(prisma as any)).resolves.toEqual({
      eligible: 1,
      updated: 0,
      skipped: 0,
      failed: 1,
    });
  });
});
