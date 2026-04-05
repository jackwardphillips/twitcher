import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestionService } from './ingestion-service.js';
import { ImapClient } from './imap-client.js';
import { db } from './db.js';

vi.mock('./imap-client.js');
vi.mock('./db.js', () => ({
  db: {
    incomingEmail: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('IngestionService', () => {
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

  it('should ingest unique emails and ignore duplicates', async () => {
    const mockEmails = [
      { messageId: 'msg1', subject: 'Subject 1', from: 'sender@test.com', date: new Date(), rawBody: 'Body 1' },
      { messageId: 'msg2', subject: 'Subject 2', from: 'sender@test.com', date: new Date(), rawBody: 'Body 2' },
    ];

    mockImapClient.fetchRecentAlerts.mockResolvedValue(mockEmails);
    
    // msg1 exists, msg2 is new
    (db.incomingEmail.findUnique as any)
      .mockResolvedValueOnce({ messageId: 'msg1' })
      .mockResolvedValueOnce(null);

    const result = await service.ingest();

    expect(db.incomingEmail.create).toHaveBeenCalledTimes(1);
    expect(db.incomingEmail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ messageId: 'msg2' }),
    });
    expect(result.ingested).toBe(1);
    expect(result.skipped).toBe(1);
  });
});
