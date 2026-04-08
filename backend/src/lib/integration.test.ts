import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestionService } from './ingestion-service.js';
import { ImapClient } from './imap-client.js';
import { db } from './db.js';
import * as sightingService from './sighting-service.js';

vi.mock('./imap-client.js');
vi.mock('./sighting-service.js');
vi.mock('./db.js', () => ({
  db: {
    incomingEmail: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Ingestion Integration', () => {
  let service: IngestionService;
  let mockImapClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockImapClient = {
      fetchRecentAlerts: vi.fn(),
    };
    (ImapClient as any).mockImplementation(() => mockImapClient);
    service = new IngestionService(mockImapClient);
  });

  it('should ingest and immediately parse sightings from emails', async () => {
    const rawBody = `Common Crane (Grus grus) (1)
- Reported Nov 10, 2024 08:35 by John Doe
- Test Location
- Map: http://maps.google.com/?q=42.45,-76.48
- Checklist: http://ebird.org/checklist/S123
- Comments: "Rare crane sighting"`;

    const mockEmail = { 
      messageId: 'msg-integ', 
      subject: 'Alert', 
      from: 'ebird-alert@birds.cornell.edu', 
      date: new Date(), 
      rawBody 
    };

    mockImapClient.fetchRecentAlerts.mockResolvedValue([mockEmail]);
    (db.incomingEmail.findUnique as any).mockResolvedValue(null);
    (db.incomingEmail.create as any).mockResolvedValue({ id: 1, ...mockEmail });

    await service.ingest();

    expect(db.incomingEmail.create).toHaveBeenCalled();
    expect(sightingService.saveSightings).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          species: 'Common Crane',
          observer: 'John Doe',
        })
      ]),
      true
    );
    expect(db.incomingEmail.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'processed' },
    });
  });
});
