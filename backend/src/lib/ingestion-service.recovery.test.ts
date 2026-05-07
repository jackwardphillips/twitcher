import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestionService } from './ingestion-service.js';
import { ImapClient } from './imap-client.js';
import { db } from './db.js';

// Mock ImapClient
vi.mock('./imap-client.js');

describe('IngestionService Recovery', () => {
  let service: IngestionService;
  let mockImapClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockImapClient = {
      fetchRecentAlerts: vi.fn().mockResolvedValue([]),
    };
    (ImapClient as any).mockImplementation(() => mockImapClient);
    service = new IngestionService(mockImapClient);

    // Clean up DB
    await db.incomingEmail.deleteMany();
    await db.sighting.deleteMany();
    
    await db.rarityCode.upsert({
      where: { scientificName: 'Grus grus' },
      update: {},
      create: {
        scientificName: 'Grus grus',
        commonName: 'Common Crane',
        abaCode: 4,
      }
    });
  });

  const getRecentDate = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 30);
    return d;
  };

  const getRawBody = (date: Date) => {
    const dateStr = date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false });
    return `Common Crane (Grus grus) (1)
- Reported ${dateStr} by John Doe
- Test Location
- Map: http://maps.google.com/?q=42.45,-76.48
- Checklist: http://ebird.org/checklist/S123
- Comments: "Rare crane sighting"`;
  };

  it('should recover and process an email stuck in "processing" state for more than 15 minutes', async () => {
    const date = getRecentDate();
    const body = getRawBody(date);

    // Create a "stuck" email
    // We can't easily force updatedAt in Prisma without using raw SQL or wait
    // But we can manually set it if we bypass the @updatedAt hook or just wait 15 mins (not practical)
    // Actually, we can use $executeRaw to set updatedAt
    const email = await db.incomingEmail.create({
      data: {
        messageId: 'stuck-msg-1',
        subject: 'Stuck Alert',
        from: 'ebird-alert@birds.cornell.edu',
        date: date,
        rawBody: body,
        status: 'processing'
      }
    });

    // Force updatedAt to be 30 minutes ago
    const thirtyMinsAgo = new Date();
    thirtyMinsAgo.setMinutes(thirtyMinsAgo.getMinutes() - 30);
    
    await db.$executeRaw`UPDATE IncomingEmail SET updatedAt = ${thirtyMinsAgo.toISOString()} WHERE id = ${email.id}`;

    // Run ingestion
    const results = await service.ingest();

    // Verify results
    expect(results.ingested).toBe(1);
    
    const updatedEmail = await db.incomingEmail.findUnique({
      where: { id: email.id }
    });
    expect(updatedEmail!.status).toBe('processed');
  });

  it('should NOT recover an email that was just updated in "processing" state', async () => {
    const date = getRecentDate();
    const body = getRawBody(date);

    // Create a "fresh" processing email
    const email = await db.incomingEmail.create({
      data: {
        messageId: 'fresh-processing-1',
        subject: 'Fresh Alert',
        from: 'ebird-alert@birds.cornell.edu',
        date: date,
        rawBody: body,
        status: 'processing'
      }
    });

    // Run ingestion
    const results = await service.ingest();

    // Verify it was NOT ingested (still processing)
    expect(results.ingested).toBe(0);
    
    const updatedEmail = await db.incomingEmail.findUnique({
      where: { id: email.id }
    });
    expect(updatedEmail!.status).toBe('processing');
  });
});
