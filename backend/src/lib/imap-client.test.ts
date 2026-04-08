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

  it('should fetch emails with ABA Rarities in the subject', async () => {
    const mockMessages = [
      {
        uid: 1,
        envelope: { 
          messageId: 'msg1', 
          subject: '[eBird Alert] ABA Rarities daily', 
          from: [{ address: 'ebird-alert@birds.cornell.edu' }], 
          date: new Date() 
        },
        source: Buffer.from('Email body 1'),
      },
      {
        uid: 2,
        envelope: { 
          messageId: 'msg2', 
          subject: '[eBird Alert] Fairfield County Rare Bird Alert daily', 
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
        subject: 'ABA Rarities',
        since: expect.any(Date)
      }),
      { envelope: true, source: true }
    );
    expect(emails).toHaveLength(1);
    expect(emails[0].messageId).toBe('msg1');
    expect(emails[0].subject).toContain('ABA Rarities');
    expect(mockImapFlow.logout).toHaveBeenCalled();
  });

  it('should use the provided "since" date when specified', async () => {
    const customSince = new Date('2026-01-01');
    
    async function* mockFetchGenerator() {}
    mockImapFlow.fetch.mockReturnValue(mockFetchGenerator());

    await client.fetchRecentAlerts(customSince);

    expect(mockImapFlow.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ 
        from: 'ebird-alert@birds.cornell.edu',
        subject: 'ABA Rarities',
        since: customSince
      }),
      expect.anything()
    );
  });

  it('should default to 1 day ago when "since" is not provided', async () => {
    async function* mockFetchGenerator() {}
    mockImapFlow.fetch.mockReturnValue(mockFetchGenerator());

    const before = new Date();
    before.setDate(before.getDate() - 1);
    
    await client.fetchRecentAlerts();

    const fetchCall = mockImapFlow.fetch.mock.calls[0];
    const actualSince = fetchCall[0].since;
    
    expect(fetchCall[0].from).toBe('ebird-alert@birds.cornell.edu');
    expect(fetchCall[0].subject).toBe('ABA Rarities');
    expect(Math.abs(actualSince.getTime() - before.getTime())).toBeLessThan(5000);
  });

  it('should handle IMAP connection errors gracefully', async () => {
    mockImapFlow.connect.mockRejectedValue(new Error('Connection failed'));

    await expect(client.fetchRecentAlerts()).rejects.toThrow('Connection failed');
  });
});
