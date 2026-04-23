import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { runSummarizationCycle } from './summarization-service';

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

describe('Summarization Efficiency Research', () => {
  let originalFetch: any;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-22T10:00:00Z'));
    originalFetch = global.fetch;
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GROQ_API_KEY = 'test-groq-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('quantifies redundant calls in a summarization cycle', async () => {
    const sevenDaysAgo = new Date('2026-04-15T10:00:00Z');
    const yesterday = new Date('2026-04-21T10:00:00Z');
    
    // 3 active incidents:
    // 1. No existing summary
    // 2. Existing summary, but new sighting after summary
    // 3. Existing summary, no new sighting since then (REDUNDANT)
    const activeIncidents = [
      { id: 'inc-1', commonName: 'Bird 1', lastSeen: yesterday, summaryGeneratedAt: null, status: 'OPEN' },
      { id: 'inc-2', commonName: 'Bird 2', lastSeen: yesterday, summaryGeneratedAt: sevenDaysAgo, status: 'OPEN' },
      { id: 'inc-3', commonName: 'Bird 3', lastSeen: sevenDaysAgo, summaryGeneratedAt: yesterday, status: 'OPEN' },
    ];
    
    prismaMock.incident.findMany.mockResolvedValue(activeIncidents);
    
    // Mock getRecentComments to return some text for all
    prismaMock.sighting.findMany.mockResolvedValue([{ details: 'Some signal' }]);
    
    // Mock findUnique for each incident
    prismaMock.incident.findUnique.mockImplementation(({ where }: any) => {
      return activeIncidents.find(i => i.id === where.id);
    });

    // Mock fetch for LLM
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Mock summary' } }]
      })
    });
    global.fetch = fetchSpy;

    const cyclePromise = runSummarizationCycle(prismaMock as any);
    
    // Advance timers for 3 incidents (2s each = 6s)
    await vi.advanceTimersByTimeAsync(10000);
    await cyclePromise;

    console.log(`Fetch calls: ${fetchSpy.mock.calls.length}`);
    
    // Now it should be 2 because inc-3 is filtered out
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    
    // incident 'inc-3' is redundant because lastSeen (April 15) <= summaryGeneratedAt (April 21)
  });

  it('filters out incidents that do not need summarization', async () => {
    const sevenDaysAgo = new Date('2026-04-15T10:00:00Z');
    const yesterday = new Date('2026-04-21T10:00:00Z');
    
    // 1. New incident (NEEDS)
    // 2. Updated incident (NEEDS)
    // 3. Stale incident (SKIPS)
    const activeIncidents = [
      { id: 'inc-1', commonName: 'Bird 1', lastSeen: yesterday, summaryGeneratedAt: null, status: 'OPEN' },
      { id: 'inc-2', commonName: 'Bird 2', lastSeen: yesterday, summaryGeneratedAt: sevenDaysAgo, status: 'OPEN' },
      { id: 'inc-3', commonName: 'Bird 3', lastSeen: sevenDaysAgo, summaryGeneratedAt: yesterday, status: 'OPEN' },
    ];
    
    prismaMock.incident.findMany.mockResolvedValue(activeIncidents);
    prismaMock.sighting.findMany.mockResolvedValue([{ details: 'Some signal' }]);
    prismaMock.incident.findUnique.mockImplementation(({ where }: any) => {
      return activeIncidents.find(i => i.id === where.id);
    });

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Mock summary' } }] })
    });
    global.fetch = fetchSpy;

    const cyclePromise = runSummarizationCycle(prismaMock as any);
    await vi.advanceTimersByTimeAsync(10000);
    await cyclePromise;

    // We WANT it to be 2, but currently it's 3
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('skips direct summarizeIncident if no new sightings exist since summaryGeneratedAt', async () => {
    const lastSummaryDate = new Date('2026-04-21T10:00:00Z');
    const staleSightingDate = new Date('2026-04-20T10:00:00Z');
    
    const mockIncident = { 
      id: 'inc-1', 
      commonName: 'Bird 1', 
      lastSeen: staleSightingDate, 
      summaryGeneratedAt: lastSummaryDate, 
      geminiSummary: 'Existing summary' 
    };
    
    prismaMock.incident.findUnique.mockResolvedValue(mockIncident);
    
    // Sighting is OLDER than summary
    prismaMock.sighting.findMany.mockResolvedValue([{ details: 'Old signal', date: staleSightingDate }]);

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Mock summary' } }] })
    });
    global.fetch = fetchSpy;

    const { summarizeIncident } = await import('./summarization-service');
    await summarizeIncident(prismaMock as any, 'inc-1');

    // It should skip fetch because the incident is stale
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
