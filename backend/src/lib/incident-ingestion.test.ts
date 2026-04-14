import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { IngestionService } from './ingestion-service.js';
import { ImapClient } from './imap-client.js';
import { prisma } from './db.js';

// Mock ImapClient to return a fixed alert
vi.mock('./imap-client.js');

describe('Incident Ingestion Integration', () => {
  let service: IngestionService;
  let mockImapClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Clean up DB before each test
    await prisma.sighting.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.incomingEmail.deleteMany();

    mockImapClient = {
      fetchRecentAlerts: vi.fn(),
    };
    (ImapClient as any).mockImplementation(() => mockImapClient);
    service = new IngestionService(mockImapClient);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should cluster a new sighting into a new incident during ingestion', async () => {
    const rawBody = `Tricolored Munia (Lonchura malacca) (1)
- Reported Apr 01, 2026 10:00 by John Doe
- Test Location, Montgomery, PA, US
- Map: http://maps.google.com/?q=3D40.0,-75.0
- Checklist: http://ebird.org/checklist/S123
- Comments: "Rare sighting"`;

    const mockEmail = { 
      messageId: 'msg-clustering-1', 
      subject: 'ABA Alert', 
      from: 'ebird-alert@birds.cornell.edu', 
      date: new Date(), 
      rawBody 
    };

    mockImapClient.fetchRecentAlerts.mockResolvedValue([mockEmail]);

    // We disable enrichment in saveSightings for this test to avoid eBird API calls
    // But we need to ensure latitude/longitude are set by the parser
    const result = await service.ingest(undefined, false);

    expect(result.ingested).toBe(1);

    // Verify Sighting was created
    const sighting = await prisma.sighting.findFirst({
      where: { species: 'Tricolored Munia' }
    });
    expect(sighting).not.toBeNull();
    expect(sighting?.latitude).toBe(40.0);
    expect(sighting?.longitude).toBe(-75.0);

    // Verify Incident was created and linked
    const incident = await prisma.incident.findFirst({
      where: { scientificName: 'Lonchura malacca' }
    });
    expect(incident).not.toBeNull();
    expect(sighting?.incidentId).toBe(incident?.id);
    expect(incident?.sightingCount).toBe(1);
    expect(incident?.primaryState).toBe('PA');
  });

  it('should cluster multiple sightings into the same incident if they are nearby', async () => {
    const rawBody1 = `Tricolored Munia (Lonchura malacca) (1)
- Reported Apr 01, 2026 10:00 by John Doe
- Test Location 1, Montgomery, PA, US
- Map: http://maps.google.com/?q=3D40.0,-75.0
- Checklist: http://ebird.org/checklist/S123`;

    const rawBody2 = `Tricolored Munia (Lonchura malacca) (1)
- Reported Apr 01, 2026 11:00 by Jane Smith
- Test Location 2, Montgomery, PA, US
- Map: http://maps.google.com/?q=3D40.01,-75.01
- Checklist: http://ebird.org/checklist/S124`;

    const mockEmail1 = { 
      messageId: 'msg-c-1', subject: 'Alert 1', from: 'ebird', date: new Date(), rawBody: rawBody1 
    };
    const mockEmail2 = { 
      messageId: 'msg-c-2', subject: 'Alert 2', from: 'ebird', date: new Date(), rawBody: rawBody2 
    };

    // First ingestion
    mockImapClient.fetchRecentAlerts.mockResolvedValue([mockEmail1]);
    await service.ingest(undefined, false);

    // Second ingestion
    mockImapClient.fetchRecentAlerts.mockResolvedValue([mockEmail2]);
    await service.ingest(undefined, false);

    // Verify both sightings linked to ONE incident
    const sightings = await prisma.sighting.findMany({
      where: { species: 'Tricolored Munia' },
      orderBy: { date: 'asc' }
    });
    expect(sightings.length).toBe(2);
    expect(sightings[0]?.incidentId).toBe(sightings[1]?.incidentId);

    const incident = await prisma.incident.findFirst({
      where: { scientificName: 'Lonchura malacca' }
    });
    expect(incident?.sightingCount).toBe(2);
    expect(incident?.lastSeen.getTime()).toBe(sightings[1]?.date.getTime());
  });
});
