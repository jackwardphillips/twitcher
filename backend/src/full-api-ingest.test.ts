import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import { ImapClient } from './lib/imap-client.js';
import { db } from './lib/db.js';
import * as sightingService from './lib/sighting-service.js';

// Mock ImapClient to avoid real IMAP connections
vi.mock('./lib/imap-client.js');
// Mock sightingService to avoid real background enrichment/DB calls
vi.mock('./lib/sighting-service.js');
// Mock DB
vi.mock('./lib/db.js', () => ({
  db: {
    incomingEmail: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  prisma: {
    sighting: {
      findMany: vi.fn(),
    },
    incident: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    }
  }
}));

describe('Full API Ingestion Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should go through the full flow: API -> Service -> Parser -> DB', async () => {
    const rawBody = `Common Crane (Grus grus) (1)
- Reported Nov 10, 2024 08:35 by John Doe
- Test Location
- Map: http://maps.google.com/?q=42.45,-76.48
- Checklist: http://ebird.org/checklist/S123
- Comments: "Rare crane sighting"`;

    const mockEmail = { 
      messageId: 'msg-full-api', 
      subject: 'Alert', 
      from: 'ebird-alert@birds.cornell.edu', 
      date: new Date(), 
      rawBody 
    };

    // Setup ImapClient mock
    (ImapClient.prototype.fetchRecentAlerts as any).mockResolvedValue([mockEmail]);
    
    // Setup DB mocks
    (db.incomingEmail.findUnique as any).mockResolvedValue(null);
    (db.incomingEmail.create as any).mockResolvedValue({ id: 100, ...mockEmail });
    (db.incomingEmail.update as any).mockResolvedValue({ id: 100 });

    // Call the API
    const response = await request(app).post('/api/ingest');

    // Verify API response
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Ingestion complete');
    expect(response.body.results.ingested).toBe(1);

    // Verify ImapClient was called
    expect(ImapClient.prototype.fetchRecentAlerts).toHaveBeenCalled();

    // Verify DB calls for incoming email
    expect(db.incomingEmail.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        messageId: 'msg-full-api',
        rawBody: rawBody,
        status: 'new'
      })
    }));

    // Verify SightingService was called (proves parser and integration works)
    expect(sightingService.saveSightings).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          species: 'Common Crane',
          observer: 'John Doe',
          location: 'Test Location'
        })
      ]),
      true
    );

    // Verify status updated to processed
    expect(db.incomingEmail.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: { status: 'processed' }
    });
  });
});
