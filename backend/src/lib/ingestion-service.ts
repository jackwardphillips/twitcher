import { ImapClient } from './imap-client.js';
import { db } from './db.js';
import { parseEBirdAlert } from './ebird-parser.js';
import { saveSightings } from './sighting-service.js';

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

        const saved = await db.incomingEmail.create({
          data: {
            messageId: email.messageId,
            subject: email.subject,
            from: email.from,
            date: email.date,
            rawBody: email.rawBody,
            status: 'new',
          },
        });

        // Auto-parse immediately
        try {
          const sightings = parseEBirdAlert(email.rawBody);
          if (sightings.length > 0) {
            await saveSightings(sightings);
          }
          
          await db.incomingEmail.update({
            where: { id: saved.id },
            data: { status: 'processed' },
          });
          ingested++;
        } catch (parseError) {
          console.error(`Failed to parse email ${email.messageId}:`, parseError);
          await db.incomingEmail.update({
            where: { id: saved.id },
            data: { status: 'failed' },
          });
          failed++;
        }
      } catch (error) {
        console.error(`Failed to ingest email ${email.messageId}:`, error);
        failed++;
      }
    }

    return { ingested, skipped, failed };
  }
}
