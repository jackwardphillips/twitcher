import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestionService } from './ingestion-service.js';
import { ImapClient } from './imap-client.js';
import { db } from './db.js';
import { parseEBirdAlert } from './ebird-parser.js';
import { saveSightings } from './sighting-service.js';

vi.mock('./imap-client.js');
vi.mock('./ebird-parser.js');
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

  it('should ingest unique emails, parse them, and save sightings', async () => {
    const mockEmails = [
      { messageId: 'msg1', subject: 'Subject 1', from: 'sender@test.com', date: new Date(), rawBody: 'Body 1' },
    ];

    mockImapClient.fetchRecentAlerts.mockResolvedValue(mockEmails);
    
    // msg1 is new
    (db.incomingEmail.findUnique as any).mockResolvedValue(null);
    (db.incomingEmail.create as any).mockResolvedValue({ id: 1, ...mockEmails[0] });
    (db.incomingEmail.update as any).mockResolvedValue({ id: 1 });
    (parseEBirdAlert as any).mockReturnValue([{ species: 'Hawk' }]);
    (saveSightings as any).mockResolvedValue(undefined);

    const result = await service.ingest(undefined, true);

    expect(db.incomingEmail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ messageId: 'msg1', status: 'new' }),
    });
    expect(parseEBirdAlert).toHaveBeenCalledWith('Body 1');
    expect(saveSightings).toHaveBeenCalledWith([{ species: 'Hawk' }], true);
    expect(db.incomingEmail.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'processed' },
    });
    expect(result.ingested).toBe(1);
    expect(result.status).toBe('success');
  });

  it('should pass enrich=false to saveSightings', async () => {
    const mockEmails = [
      { messageId: 'msg1', subject: 'Subject 1', from: 'sender@test.com', date: new Date(), rawBody: 'Body 1' },
    ];
    mockImapClient.fetchRecentAlerts.mockResolvedValue(mockEmails);
    (db.incomingEmail.findUnique as any).mockResolvedValue(null);
    (db.incomingEmail.create as any).mockResolvedValue({ id: 1, ...mockEmails[0] });
    (parseEBirdAlert as any).mockReturnValue([{ species: 'Hawk' }]);
    
    await service.ingest(undefined, false);
    expect(saveSightings).toHaveBeenCalledWith(expect.anything(), false);
  });

  it('should return no_new_emails when imap returns empty', async () => {
    mockImapClient.fetchRecentAlerts.mockResolvedValue([]);
    const result = await service.ingest();
    expect(result.status).toBe('no_new_emails');
  });

  it('should return imap_error when imap fails', async () => {
    mockImapClient.fetchRecentAlerts.mockRejectedValue(new Error('IMAP error'));
    const result = await service.ingest();
    expect(result.status).toBe('imap_error');
    expect(result.error).toBe('IMAP error');
  });

  it('should ignore duplicate emails', async () => {
    const mockEmails = [
      { messageId: 'msg1', subject: 'Subject 1', from: 'sender@test.com', date: new Date(), rawBody: 'Body 1' },
    ];

    mockImapClient.fetchRecentAlerts.mockResolvedValue(mockEmails);
    
    // msg1 already exists
    (db.incomingEmail.findUnique as any).mockResolvedValue({ id: 1, messageId: 'msg1' });

    const result = await service.ingest();

    expect(db.incomingEmail.create).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
    expect(result.ingested).toBe(0);
    expect(result.status).toBe('success');
  });

  it('should mark email as failed if parsing or saving fails', async () => {
    const mockEmails = [
      { messageId: 'msg1', subject: 'Subject 1', from: 'sender@test.com', date: new Date(), rawBody: 'Body 1' },
    ];

    mockImapClient.fetchRecentAlerts.mockResolvedValue(mockEmails);
    
    // msg1 is new
    (db.incomingEmail.findUnique as any).mockResolvedValue(null);
    (db.incomingEmail.create as any).mockResolvedValue({ id: 1, ...mockEmails[0] });
    (parseEBirdAlert as any).mockImplementation(() => { throw new Error('Parse error'); });

    const result = await service.ingest();

    expect(db.incomingEmail.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'failed' },
    });
    expect(result.failed).toBe(1);
    expect(result.ingested).toBe(0);
  });
});
