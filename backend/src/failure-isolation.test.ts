import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import { ImapClient } from './lib/imap-client.js';
import { prisma } from './lib/db.js';
import * as summarizationService from './lib/summarization-service.js';
import { PhotoService } from './lib/photo-service.js';

vi.mock('./lib/imap-client.js');
vi.mock('./lib/summarization-service.js');
vi.mock('./lib/photo-service.js');

describe('Failure Isolation', () => {
  let mockImapClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    await prisma.sighting.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.incomingEmail.deleteMany();

    mockImapClient = {
      fetchRecentAlerts: vi.fn(),
    };
    vi.mocked(ImapClient).mockImplementation(function() {
      return mockImapClient;
    });
  });

  it('should not break /api/ingest if background summarization fails', async () => {
    const date = new Date();
    const rawBody = `Common Loon (Gavia immer) (1)
- Reported Today by John Doe
- Test Location
- Map: http://maps.google.com/?q=3D45,-70`;

    mockImapClient.fetchRecentAlerts.mockResolvedValue([{ 
      messageId: 'msg-failure-test', 
      subject: 'Alert', 
      from: 'ebird-alert@birds.cornell.edu', 
      date: date, 
      rawBody 
    }]);

    // Mock summarization to fail
    vi.mocked(summarizationService.runSummarizationCycle).mockRejectedValue(new Error('Summarization Boom!'));

    const response = await request(app).post('/api/ingest');

    // Assert: API still returns 200
    expect(response.status).toBe(200);
    expect(response.body.results.ingested).toBe(1);
    expect(summarizationService.runSummarizationCycle).toHaveBeenCalled();
  });

  it('should not break /api/incidents if background photo fetch fails', async () => {
    // 1. Arrange: Create an incident
    await prisma.incident.create({
      data: {
        scientificName: 'Gavia immer',
        commonName: 'Common Loon',
        status: 'OPEN',
        minLat: 45, maxLat: 45, minLng: -70, maxLng: -70,
        firstSeen: new Date(),
        lastSeen: new Date(),
        sightingCount: 1,
        statesCovered: '["ME"]'
      }
    });

    // Mock PhotoService to fail
    vi.mocked(PhotoService.prototype.needsFetch).mockResolvedValue(true);
    vi.mocked(PhotoService.prototype.fetchSpeciesPhoto).mockRejectedValue(new Error('Photo Boom!'));

    const response = await request(app).get('/api/incidents');

    // Assert: API still returns 200
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    expect(PhotoService.prototype.fetchSpeciesPhoto).toHaveBeenCalledWith('Gavia immer');
  });
});
