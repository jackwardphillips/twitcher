import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImapClient } from './imap-client.js';
import { ImapFlow } from 'imapflow';

vi.mock('imapflow');

describe('ImapClient', () => {
  let client: ImapClient;
  let mockImapFlow: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockImapFlow = {
      connect: vi.fn().mockResolvedValue(undefined),
      getMailboxLock: vi.fn().mockResolvedValue({ release: vi.fn() }),
      fetch: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
    };
    (ImapFlow as any).mockImplementation(function() {
      return mockImapFlow;
    });

    client = new ImapClient({
      host: 'imap.test.com',
      port: 993,
      user: 'test@test.com',
      pass: 'password',
    });
  });

  it('should fetch emails from ebird-alert@birds.cornell.edu from the last 24 hours', async () => {
    const mockMessages = [
      {
        uid: 1,
        envelope: { 
          messageId: 'msg1', 
          subject: 'Alert', 
          from: [{ address: 'ebird-alert@birds.cornell.edu' }], 
          date: new Date() 
        },
        source: Buffer.from('Email body 1'),
      },
      {
        uid: 2,
        envelope: { 
          messageId: 'msg2', 
          subject: 'Alert', 
          from: [{ address: 'ebird-alert@birds.cornell.edu' }], 
          date: new Date() 
        },
        source: Buffer.from('Email body 2'),
      },
    ];

    async function* mockFetchGenerator() {
      for (const msg of mockMessages) {
        yield msg;
      }
    }

    mockImapFlow.fetch.mockReturnValue(mockFetchGenerator());

    const emails = await client.fetchRecentAlerts();

    expect(mockImapFlow.connect).toHaveBeenCalled();
    expect(mockImapFlow.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ 
        from: 'ebird-alert@birds.cornell.edu',
        since: expect.any(Date)
      }),
      { envelope: true, source: true }
    );
    expect(emails).toHaveLength(2);
    expect(emails[0].messageId).toBe('msg1');
    expect(emails[0].rawBody).toBe('Email body 1');
    expect(mockImapFlow.logout).toHaveBeenCalled();
  });

  it('should handle IMAP connection errors gracefully', async () => {
    mockImapFlow.connect.mockRejectedValue(new Error('Connection failed'));

    await expect(client.fetchRecentAlerts()).rejects.toThrow('Connection failed');
  });
});
