import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getRecentComments, summarizeIncident } from './summarization-service';

// Mock Prisma
const prismaMock = {
  sighting: {
    findMany: vi.fn(),
  },
  incident: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

describe('SummarizationService', () => {
  describe('getRecentComments', () => {
    beforeEach(() => {
      vi.resetAllMocks();
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-20T10:00:00Z'));
    });

    it('should aggregate comments from the last 7 days only', async () => {
      const incidentId = 'inc-123';
      
      // Filter is handled by Prisma query in implementation, so we mock it returning filtered results
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
    beforeEach(() => {
      vi.resetAllMocks();
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-20T10:00:00Z'));
      process.env.GEMINI_API_KEY = 'test-key';
    });

    it('should skip summarization if no API key is present', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      try {
        await summarizeIncident(prismaMock as any, 'inc-1');
        expect(prismaMock.incident.update).not.toHaveBeenCalled();
      } finally {
        process.env.GEMINI_API_KEY = originalKey;
      }
    });

    it('should skip summarization if no comments exist and no existing summary', async () => {
      prismaMock.incident.findUnique.mockResolvedValue({ id: 'inc-1', geminiSummary: null });
      prismaMock.sighting.findMany.mockResolvedValue([]); // No comments
      
      await summarizeIncident(prismaMock as any, 'inc-1');
      
      expect(prismaMock.incident.update).not.toHaveBeenCalled();
    });

    it('should call Gemini API and update incident when comments exist', async () => {
      const mockIncident = { id: 'inc-1', geminiSummary: 'Old summary', summaryGeneratedAt: null };
      prismaMock.incident.findUnique.mockResolvedValue(mockIncident);
      prismaMock.sighting.findMany.mockResolvedValue([
        { details: 'New sighting info' }
      ]);

      // Mocking fetch for Gemini API
      const globalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Updated AI summary' }] } }]
        })
      });

      try {
        await summarizeIncident(prismaMock as any, 'inc-1');

        expect(prismaMock.incident.update).toHaveBeenCalledWith({
          where: { id: 'inc-1' },
          data: {
            geminiSummary: 'Updated AI summary',
            summaryGeneratedAt: new Date('2026-04-20T10:00:00Z'),
          }
        });
      } finally {
        global.fetch = globalFetch;
      }
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
});
