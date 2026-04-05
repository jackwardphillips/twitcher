import { ImapClient } from './imap-client.js';
import { db } from './db.js';

export interface IngestionResult {
  ingested: number;
  skipped: number;
  failed: number;
}

export class IngestionService {
  private imapClient: ImapClient;

  constructor(imapClient: ImapClient) {
    this.imapClient = imapClient;
  }

  async ingest(): Promise<IngestionResult> {
    const emails = await this.imapClient.fetchRecentAlerts();
    let ingested = 0;
    let skipped = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        const existing = await db.incomingEmail.findUnique({
          where: { messageId: email.messageId },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await db.incomingEmail.create({
          data: {
            messageId: email.messageId,
            subject: email.subject,
            from: email.from,
            date: email.date,
            rawBody: email.rawBody,
            status: 'new',
          },
        });
        ingested++;
      } catch (error) {
        console.error(`Failed to ingest email ${email.messageId}:`, error);
        failed++;
      }
    }

    return { ingested, skipped, failed };
  }
}
