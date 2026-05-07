import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestionService } from './ingestion-service.js';
import { ImapClient } from './imap-client.js';
import { saveSightings } from './sighting-service.js';
import { db } from './db.js';

// Mock ImapClient
vi.mock('./imap-client.js');
// Mock sighting-service to observe calls
vi.mock('./sighting-service.js', async () => {
  const actual = await vi.importActual('./sighting-service.js') as any;
  return {
    ...actual,
    saveSightings: vi.fn(async (...args) => {
        // Artificial delay to encourage overlap
        await new Promise(resolve => setTimeout(resolve, 50));
        return actual.saveSightings(...args);
    }),
  };
});

describe('IngestionService Concurrency', () => {
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

  it('should process a pending email only once even with concurrent ingest() calls (deterministic overlap)', async () => {
    // RACE: Two workers both see an email with status='new' and try to process it.
    // FIX: Atomic updateMany({ where: { status: 'new' }, data: { status: 'processing' } })
    // only returns count=1 for the winner.
    
    const date = getRecentDate();
    const body = getRawBody(date);

    // Create a pending email
    await db.incomingEmail.create({
      data: {
        messageId: 'concurrent-msg-1',
        subject: 'Pending Alert',
        from: 'ebird-alert@birds.cornell.edu',
        date: date,
        rawBody: body,
        status: 'new'
      }
    });

    // Inject a delay into the FIRST updateMany to force the second worker to attempt a concurrent claim
    const originalUpdateMany = db.incomingEmail.updateMany;
    let claimCallCount = 0;
    vi.spyOn(db.incomingEmail, 'updateMany').mockImplementation(async (args) => {
        claimCallCount++;
        if (claimCallCount === 1) {
            // First worker stalls during claim
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        return originalUpdateMany.call(db.incomingEmail, args);
    });

    // Run two ingestions concurrently
    const [res1, res2] = await Promise.all([
      service.ingest(),
      service.ingest()
    ]);

    // One should have ingested it, the other should have skipped it (claimed=false)
    const totalIngested = res1.ingested + res2.ingested;
    expect(totalIngested).toBe(1);
    
    // saveSightings should only be called once
    expect(vi.mocked(saveSightings)).toHaveBeenCalledTimes(1);
  });
});
