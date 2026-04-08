import { ImapFlow } from 'imapflow';

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure?: boolean;
}

export interface IngestedEmail {
  messageId: string;
  subject: string;
  from: string;
  date: Date;
  rawBody: string;
}

export class ImapClient {
  private config: ImapConfig;

  constructor(config: ImapConfig) {
    this.config = config;
  }

  async fetchRecentAlerts(since?: Date): Promise<IngestedEmail[]> {
    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure ?? true,
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
      logger: false,
    });

    await client.connect();

    const emails: IngestedEmail[] = [];
    const searchDate = since || new Date();
    if (!since) {
      searchDate.setDate(searchDate.getDate() - 1);
    }

    const lock = await client.getMailboxLock('INBOX');
    try {
      const searchCriteria = {
        since: searchDate,
        from: 'ebird-alert@birds.cornell.edu',
        subject: 'ABA Rarities',
      };

      for await (const message of client.fetch(searchCriteria, { envelope: true, source: true })) {
        const from = message.envelope.from?.[0]?.address || 'unknown';
        const subject = message.envelope.subject || '';
        
        // Filter by sender and ABA Rarities subject
        if (from === 'ebird-alert@birds.cornell.edu' && subject.includes('ABA Rarities')) {
          emails.push({
            messageId: message.envelope.messageId,
            subject: subject,
            from: from,
            date: message.envelope.date,
            rawBody: message.source.toString(),
          });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    return emails;
  }
}
