import { ImapClient } from './imap-client.js';
import { db } from './db.js';
import { parseEBirdAlert } from './ebird-parser.js';
import { saveSightings } from './sighting-service.js';

export interface IngestionResult {
  ingested: number;
  skipped: number;
  failed: number;
  status: 'success' | 'no_new_emails' | 'imap_error';
  enrichmentStatus?: 'success' | 'partial_failure' | 'failed' | 'not_requested';
  error?: string;
}

export class IngestionService {
  private imapClient: ImapClient;

  constructor(imapClient: ImapClient) {
    this.imapClient = imapClient;
  }

  async ingest(since?: Date, enrich = true): Promise<IngestionResult> {
    try {
      const newEmails = await this.imapClient.fetchRecentAlerts(since);
      
      // Also fetch any 'new' or 'failed' emails from the database for retry
      const pendingEmails = await db.incomingEmail.findMany({
        where: {
          status: { in: ['new', 'failed'] }
        }
      });

      let ingested = 0;
      let skipped = 0;
      let failed = 0;
      let enrichmentAttempted = 0;
      let enrichmentSucceeded = 0;
      let enrichmentFailed = 0;

      if (newEmails.length === 0 && pendingEmails.length === 0) {
        return { ingested, skipped, failed, status: 'no_new_emails', enrichmentStatus: enrich ? 'success' : 'not_requested' };
      }

      console.log(`Found ${newEmails.length} new emails and ${pendingEmails.length} pending emails.`);

      // Combine emails: new ones from IMAP and pending ones from DB
      // Use a Map to avoid processing the same messageId twice if it appears in both
      const emailMap = new Map<string, any>();
      
      for (const email of pendingEmails) {
        emailMap.set(email.messageId, {
          dbId: email.id,
          messageId: email.messageId,
          subject: email.subject,
          from: email.from,
          date: email.date,
          rawBody: email.rawBody,
          isRetry: true
        });
      }

      for (const email of newEmails) {
        if (!emailMap.has(email.messageId)) {
          emailMap.set(email.messageId, {
            ...email,
            isRetry: false
          });
        }
      }

      const allEmails = Array.from(emailMap.values());
      let count = 0;
      for (const email of allEmails) {
        count++;
        if (count % 10 === 0 || count === allEmails.length) {
          console.log(`Processing email ${count}/${allEmails.length}...`);
        }
        try {
          let savedId = email.dbId;

          if (!email.isRetry) {
            const existing = await db.incomingEmail.findUnique({
              where: { messageId: email.messageId },
            });

            if (existing) {
              if (existing.status === 'processed') {
                skipped++;
                continue;
              }
              savedId = existing.id;
            } else {
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
              savedId = saved.id;
            }
          }

          // Auto-parse immediately
          try {
            const sightings = parseEBirdAlert(email.rawBody, email.date);
            if (sightings.length > 0) {
              const enrichment = await saveSightings(sightings, enrich);
              if (enrichment) {
                enrichmentAttempted += enrichment.attempted;
                enrichmentSucceeded += enrichment.succeeded;
                enrichmentFailed += enrichment.failed;
              }
            }
            
            await db.incomingEmail.update({
              where: { id: savedId },
              data: { status: 'processed' },
            });
            ingested++;
          } catch (parseError) {
            console.error(`Failed to parse/save email ${email.messageId}:`, parseError);
            await db.incomingEmail.update({
              where: { id: savedId },
              data: { status: 'failed' },
            });
            failed++;
          }
        } catch (error) {
          console.error(`Failed to ingest email:`, error);
          failed++;
        }
      }

      let enrichmentStatus: IngestionResult['enrichmentStatus'] = 'not_requested';
      if (enrich) {
        if (enrichmentFailed === 0) {
          enrichmentStatus = 'success';
        } else if (enrichmentSucceeded === 0 && enrichmentAttempted > 0) {
          enrichmentStatus = 'failed';
        } else {
          enrichmentStatus = 'partial_failure';
        }
      }

      return { ingested, skipped, failed, status: 'success', enrichmentStatus };
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
