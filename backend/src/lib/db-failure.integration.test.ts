import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestionService } from './ingestion-service.js';
import { ImapClient } from './imap-client.js';
import { db } from './db.js';

vi.mock('./imap-client.js');

describe('IngestionService DB Failure Simulation', () => {
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

  it('should return imap_error when database findMany fails', async () => {
    mockImapClient.fetchRecentAlerts.mockResolvedValue([]);
    
    const findManySpy = vi.spyOn(db.incomingEmail, 'findMany').mockRejectedValue(new Error('Database is down'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await service.ingest();

    expect(result.status).toBe('imap_error');
    expect(result.error).toBe('Database is down');
    expect(consoleSpy).toHaveBeenCalledWith('Ingestion failed:', expect.any(Error));

    findManySpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should mark individual emails as failed if DB create fails, but continue with others', async () => {
    const mockEmails = [
      { messageId: 'msg1', subject: 'S1', from: 'F1', date: new Date(), rawBody: 'B1' },
      { messageId: 'msg2', subject: 'S2', from: 'F2', date: new Date(), rawBody: 'B2' },
    ];
    mockImapClient.fetchRecentAlerts.mockResolvedValue(mockEmails);
    
    // msg1 fails on findUnique (DB error)
    const findUniqueSpy = vi.spyOn(db.incomingEmail, 'findUnique')
      .mockRejectedValueOnce(new Error('DB Error for msg1'))
      .mockResolvedValueOnce(null); // msg2 proceeds

    // msg2 succeeds
    const createSpy = vi.spyOn(db.incomingEmail, 'create').mockResolvedValue({ id: 2 } as any);
    const updateSpy = vi.spyOn(db.incomingEmail, 'update').mockResolvedValue({ id: 2 } as any);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await service.ingest(undefined, false);

    expect(result.failed).toBe(1); // msg1 failed
    expect(result.ingested).toBe(1); // msg2 succeeded
    expect(result.status).toBe('success');

    findUniqueSpy.mockRestore();
    createSpy.mockRestore();
    updateSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
