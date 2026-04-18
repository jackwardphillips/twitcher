import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getRecentComments, summarizeIncident, runSummarizationCycle } from './summarization-service';

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

describe('SummarizationService', () => {
  let originalFetch: any;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T10:00:00Z'));
    originalFetch = global.fetch;
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GROQ_API_KEY = 'test-groq-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('getRecentComments', () => {
    it('should aggregate comments from the last 7 days only', async () => {
      const incidentId = 'inc-123';
      
      prismaMock.sighting.findMany.mockResolvedValue([
        { details: 'Near the north gate.' },
        { details: 'Feeding in the berries.' },
      ]);
      
      const result = await getRecentComments(prismaMock as any, incidentId);
      
      expect(prismaMock.sighting.findMany).toHaveBeenCalledWith({
        where: {
          incidentId,
          date: {
            gte: new Date('2026-04-13T10:00:00Z'),
          },
          details: {
            not: null,
          },
        },
        orderBy: {
          date: 'desc',
        },
      });
      expect(result).toBe('Near the north gate. Feeding in the berries.');
    });

    it('should return an empty string if no sightings with comments exist in the window', async () => {
      prismaMock.sighting.findMany.mockResolvedValue([]);
      const result = await getRecentComments(prismaMock as any, 'inc-123');
      expect(result).toBe('');
    });
  });

  describe('summarizeIncident', () => {
    it('should skip summarization if no API key is present', async () => {
      const gKey = process.env.GEMINI_API_KEY;
      const grKey = process.env.GROQ_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.GROQ_API_KEY;
      try {
        await summarizeIncident(prismaMock as any, 'inc-1');
        expect(prismaMock.incident.update).not.toHaveBeenCalled();
      } finally {
        process.env.GEMINI_API_KEY = gKey;
        process.env.GROQ_API_KEY = grKey;
      }
    });

    it('should skip summarization if no comments exist and no existing summary', async () => {
      prismaMock.incident.findUnique.mockResolvedValue({ id: 'inc-1', geminiSummary: null });
      prismaMock.sighting.findMany.mockResolvedValue([]); // No comments
      
      await summarizeIncident(prismaMock as any, 'inc-1');
      
      expect(prismaMock.incident.update).not.toHaveBeenCalled();
    });

    it('should call Groq API and update incident when comments exist', async () => {
      const mockIncident = { id: 'inc-1', geminiSummary: 'Old summary', summaryGeneratedAt: null };
      prismaMock.incident.findUnique.mockResolvedValue(mockIncident);
      prismaMock.sighting.findMany.mockResolvedValue([
        { details: 'New sighting info' }
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Updated Groq summary' } }]
        })
      });

      await summarizeIncident(prismaMock as any, 'inc-1');

      expect(prismaMock.incident.update).toHaveBeenCalledWith({
        where: { id: 'inc-1' },
        data: {
          geminiSummary: 'Updated Groq summary',
          summaryGeneratedAt: new Date('2026-04-20T10:00:00Z'),
        }
      });
    });

    it('should fallback to Gemini if Groq fails', async () => {
      const mockIncident = { id: 'inc-1', geminiSummary: 'Old summary', summaryGeneratedAt: null };
      prismaMock.incident.findUnique.mockResolvedValue(mockIncident);
      prismaMock.sighting.findMany.mockResolvedValue([
        { details: 'New sighting info' }
      ]);

      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 500 }) // Groq fails
        .mockResolvedValueOnce({ // Gemini succeeds
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: 'Updated Gemini summary' }] } }]
          })
        });

      await summarizeIncident(prismaMock as any, 'inc-1');

      expect(prismaMock.incident.update).toHaveBeenCalledWith({
        where: { id: 'inc-1' },
        data: {
          geminiSummary: 'Updated Gemini summary',
          summaryGeneratedAt: new Date('2026-04-20T10:00:00Z'),
        }
      });
    });

    it('should not re-summarize if already summarized today', async () => {
       const mockIncident = { 
         id: 'inc-1', 
         geminiSummary: 'Today summary', 
         summaryGeneratedAt: new Date('2026-04-20T08:00:00Z') // Same day
       };
       prismaMock.incident.findUnique.mockResolvedValue(mockIncident);

       await summarizeIncident(prismaMock as any, 'inc-1');

       expect(prismaMock.sighting.findMany).not.toHaveBeenCalled();
       expect(prismaMock.incident.update).not.toHaveBeenCalled();
    });
  });

  describe('runSummarizationCycle', () => {
    it('should call summarizeIncident for all active incidents and wait between calls', async () => {
      const activeIncidents = [{ id: 'inc-1', commonName: 'Bird A' }, { id: 'inc-2', commonName: 'Bird B' }];
      prismaMock.incident.findMany.mockResolvedValue(activeIncidents);
      
      // Mock summarizeIncident behavior by mocking its prisma calls
      prismaMock.incident.findUnique.mockResolvedValue({ id: 'inc-1', geminiSummary: null, summaryGeneratedAt: null });
      prismaMock.sighting.findMany.mockResolvedValue([]); 

      const cyclePromise = runSummarizationCycle(prismaMock as any);
      
      // Advance timers for the 2 second delay between 2 incidents
      await vi.advanceTimersByTimeAsync(5000);
      
      await cyclePromise;

      expect(prismaMock.incident.findMany).toHaveBeenCalled();
      expect(prismaMock.incident.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
