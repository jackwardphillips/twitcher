import { ImapClient } from './imap-client.js';
import { db } from './db.js';
import { parseEBirdAlert } from './ebird-parser.js';
import { saveSightings } from './sighting-service.js';

export interface IngestionResult {
  ingested: number;
  skipped: number;
  failed: number;
  status: 'success' | 'no_new_emails' | 'imap_error';
  error?: string;
}

export class IngestionService {
  private imapClient: ImapClient;

  constructor(imapClient: ImapClient) {
    this.imapClient = imapClient;
  }

  async ingest(since?: Date): Promise<IngestionResult> {
    try {
      const emails = await this.imapClient.fetchRecentAlerts(since);
      let ingested = 0;
      let skipped = 0;
      let failed = 0;

      if (emails.length === 0) {
        return { ingested, skipped, failed, status: 'no_new_emails' };
      }

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

      return { ingested, skipped, failed, status: 'success' };
    } catch (error) {
      console.error('Ingestion failed:', error);
      return { 
        ingested: 0, 
        skipped: 0, 
        failed: 0, 
        status: 'imap_error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
