import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import { ImapClient } from './lib/imap-client.js';
import { db, prisma } from './lib/db.js';
import { http, HttpResponse } from 'msw';
import { server } from './test/mocks/server';

// Mock ImapClient to avoid real IMAP connections
vi.mock('./lib/imap-client.js');

describe('Full API Ingestion Flow (Real DB)', () => {
  let mockImapClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // We need to clear the DB before each run
    // Using prisma instead of db just in case there's any difference in mock state
    await prisma.sighting.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.incomingEmail.deleteMany();
    await prisma.rarityCode.deleteMany();

    mockImapClient = {
      fetchRecentAlerts: vi.fn(),
    };
    vi.mocked(ImapClient).mockImplementation(function() {
      return mockImapClient;
    });

    // Seed rarity for the species in the test
    await prisma.rarityCode.create({
      data: {
        scientificName: 'Grus grus',
        commonName: 'Common Crane',
        abaCode: 4
      }
    });
  });

  it('should go through the full flow and persist to real database', async () => {
    const date = new Date();
    date.setSeconds(0, 0); // Normalize for easier comparison
    const dateStr = date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false });
    
    const rawBody = `Common Crane (Grus grus) (1)
- Reported ${dateStr} by John Doe
- Test Location
- Map: http://maps.google.com/?q=3D42.45,-76.48
- Checklist: http://ebird.org/checklist/S123
- Comments: "Rare crane sighting"`;

    const mockEmail = { 
      messageId: 'msg-real-flow', 
      subject: 'Alert', 
      from: 'ebird-alert@birds.cornell.edu', 
      date: date, 
      rawBody 
    };

    mockImapClient.fetchRecentAlerts.mockResolvedValue([mockEmail]);

    // Mock eBird API for enrichment
    server.use(
      http.get('*/data/obs/geo/recent/notable', () => {
        return HttpResponse.json([]);
      })
    );

    // Call the API
    const response = await request(app).post('/api/ingest');

    // Verify API response
    expect(response.status).toBe(200);
    expect(response.body.results.ingested).toBe(1);

    // Verify DB state for IncomingEmail
    const savedEmail = await prisma.incomingEmail.findUnique({
      where: { messageId: 'msg-real-flow' }
    });
    expect(savedEmail).not.toBeNull();
    expect(savedEmail?.status).toBe('processed');

    // Verify DB state for Sighting
    const savedSighting = await prisma.sighting.findFirst({
      where: { species: 'Common Crane' }
    });
    expect(savedSighting).not.toBeNull();
    expect(savedSighting?.observer).toBe('John Doe');
    expect(savedSighting?.location).toBe('Test Location');
    expect(savedSighting?.rarity).toBe(4);

    // Verify Incident creation (part of SightingService integration)
    const savedIncident = await prisma.incident.findFirst({
      where: { scientificName: 'Grus grus' }
    });
    expect(savedIncident).not.toBeNull();
    expect(savedIncident?.sightingCount).toBe(1);
  });
});
