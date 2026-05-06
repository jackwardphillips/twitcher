import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import { ImapClient } from './lib/imap-client.js';
import { prisma } from './lib/db.js';

vi.mock('./lib/imap-client.js');

describe('Ingestion Concurrency', () => {
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

  it('should not create duplicate sightings when multiple ingestions run concurrently', async () => {
    const date = new Date();
    date.setSeconds(0, 0);
    const dateStr = date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false });
    
    const rawBody = `Common Crane (Grus grus) (1)
- Reported ${dateStr} by John Doe
- Test Location
- Map: http://maps.google.com/?q=3D42.45,-76.48
- Checklist: http://ebird.org/checklist/S123
- Comments: "Rare crane sighting"`;

    const mockEmail = { 
      messageId: 'msg-concurrency-test', 
      subject: 'Alert', 
      from: 'ebird-alert@birds.cornell.edu', 
      date: date, 
      rawBody 
    };

    // Make the IMAP fetch take some time to increase chance of overlap
    mockImapClient.fetchRecentAlerts.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return [mockEmail];
    });

    // Trigger two ingestions concurrently
    // One via API, and we'll simulate another one by calling the same internal logic if we could,
    // but since it's internal to index.ts, we'll just hit the API endpoint twice.
    const [res1, res2] = await Promise.all([
      request(app).post('/api/ingest'),
      request(app).post('/api/ingest')
    ]);

    // One should succeed, the other might succeed or fail depending on how it's handled,
    // but the goal is NO DUPLICATES in the DB.
    
    const emailCount = await prisma.incomingEmail.count();
    const sightings = await prisma.sighting.findMany();
    const sightingCount = sightings.length;
    const incidents = await prisma.incident.findMany();
    const incidentCount = incidents.length;

    console.log('Sightings in DB:', sightings);
    console.log('Incidents in DB:', incidents);

    expect(emailCount).toBe(1);
    expect(sightingCount).toBe(1);
    expect(incidentCount).toBe(1);

    // Also check status of responses
    // In current implementation, the second one might "fail" to ingest the email but the API still returns 200
    // because triggerIngestion returns results with failed: 1
    console.log('Res 1 results:', res1.body.results);
    console.log('Res 2 results:', res2.body.results);
  });

  it('should not create duplicate sightings when processing the same pending email concurrently', async () => {
    const date = new Date();
    date.setSeconds(0, 0);
    const dateStr = date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false });
    
    const rawBody = `Common Crane (Grus grus) (1)
- Reported ${dateStr} by John Doe
- Test Location
- Map: http://maps.google.com/?q=3D42.45,-76.48
- Checklist: http://ebird.org/checklist/S123
- Comments: "Pending email test"`;

    // 1. Arrange: Create a 'new' email in the DB
    await prisma.incomingEmail.create({
      data: {
        messageId: 'msg-pending-concurrency',
        subject: 'Alert',
        from: 'ebird-alert@birds.cornell.edu',
        date: date,
        rawBody,
        status: 'new'
      }
    });

    // Mock IMAP to return nothing new
    mockImapClient.fetchRecentAlerts.mockResolvedValue([]);

    // 2. Act: Trigger two ingestions concurrently
    // We expect both to find the 'new' email and try to process it.
    await Promise.all([
      request(app).post('/api/ingest'),
      request(app).post('/api/ingest')
    ]);

    // 3. Assert: Should still only have 1 sighting
    const sightingCount = await prisma.sighting.count();
    expect(sightingCount).toBe(1);
  });
});
