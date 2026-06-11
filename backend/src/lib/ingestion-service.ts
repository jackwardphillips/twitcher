import { ImapClient } from './imap-client.js';
import { db } from './db.js';
import { parseEBirdAlert } from './ebird-parser.js';
import { saveSightings } from './sighting-service.js';

export interface IngestionResult {
  emailsFound: number;
  ingested: number;
  skipped: number;
  failed: number;
  status: 'success' | 'no_new_emails' | 'imap_error' | 'error';
  enrichmentStatus?: 'success' | 'failed' | 'partial_failure' | 'not_requested';
  error?: string;
}

function sanitizeIngestionError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/DATABASE_URL|postgresql:\/\/|password|secret|Prisma| at /i.test(message)) {
    return 'An unexpected internal error occurred';
  }
  return message;
}

/**
 * Service responsible for ingesting eBird alert emails and converting them into sightings and incidents.
 * Handles IMAP fetching, database persistence of raw emails, and coordination with parsing and enrichment.
 */
export class IngestionService {
  private imapClient: ImapClient;

  /**
   * @param {ImapClient} imapClient - The IMAP client used to fetch emails.
   */
  constructor(imapClient: ImapClient) {
    this.imapClient = imapClient;
  }

  /**
   * Performs a full ingestion cycle.
   * Fetches new emails from IMAP and retries any previously failed or new emails stored in the database.
   * 
   * @param {Date} [since] - Optional date to fetch emails since.
   * @param {boolean} [enrich=true] - Whether to perform eBird API enrichment for discovered sightings.
   * @returns {Promise<IngestionResult>} Summary of the ingestion process.
   */
  async ingest(since?: Date, enrich = true, trigger = 'manual'): Promise<IngestionResult> {
    const run = await db.ingestionRun.create({
      data: {
        status: 'running',
        trigger,
      },
    });
    const sightingsBefore = await db.sighting.count();

    const finishRun = async (result: IngestionResult) => {
      try {
        const sightingsAfter = await db.sighting.count();
        await db.ingestionRun.update({
          where: { id: run.id },
          data: {
            finishedAt: new Date(),
            status: result.status,
            emailsFound: result.emailsFound,
            emailsIngested: result.ingested,
            sightingsAdded: Math.max(sightingsAfter - sightingsBefore, 0),
            errorMessage: result.error ?? null,
          },
        });
      } catch (error) {
        console.error('Failed to update ingestion run:', sanitizeIngestionError(error));
      }
    };

    try {
      const newEmails = await this.imapClient.fetchRecentAlerts(since);
      
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      // Also fetch any 'new', 'failed', or 'stuck processing' emails from the database for retry
      const pendingEmails = await db.incomingEmail.findMany({
        where: {
          OR: [
            { status: { in: ['new', 'failed'] } },
            { 
              status: 'processing',
              updatedAt: { lt: fifteenMinsAgo }
            }
          ]
        }
      });

      let ingested = 0;
      let skipped = 0;
      let failed = 0;
      let enrichmentAttempted = 0;
      let enrichmentSucceeded = 0;
      let enrichmentFailed = 0;

      if (newEmails.length === 0 && pendingEmails.length === 0) {
        const result: IngestionResult = { emailsFound: 0, ingested, skipped, failed, status: 'no_new_emails', enrichmentStatus: enrich ? 'success' : 'not_requested' };
        await finishRun(result);
        return result;
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
      const emailsFound = allEmails.length;
      let count = 0;
      for (const email of allEmails) {
        count++;
        if (count % 10 === 0 || count === allEmails.length) {
          console.log(`Processing email ${count}/${allEmails.length}...`);
        }
        try {
          let savedId = email.dbId;
          let claimed = false;

          if (email.isRetry) {
            // Atomic claim of existing record
            const result = await db.incomingEmail.updateMany({
              where: {
                id: savedId,
                OR: [
                  { status: { in: ['new', 'failed'] } },
                  { 
                    status: 'processing',
                    updatedAt: { lt: fifteenMinsAgo }
                  }
                ]
              },
              data: { status: 'processing' }
            });
            if (result.count === 1) {
              claimed = true;
            }
          } else {
            // New email from IMAP: try to create with 'processing' status
            try {
              const saved = await db.incomingEmail.create({
                data: {
                  messageId: email.messageId,
                  subject: email.subject,
                  from: email.from,
                  date: email.date,
                  rawBody: email.rawBody,
                  status: 'processing',
                },
              });
              savedId = saved.id;
              claimed = true;
            } catch (createError: any) {
              if (createError.code === 'P2002') { // Unique constraint violation (messageId)
                // Someone else created it (or it already existed), try to claim if it's pending
                const result = await db.incomingEmail.updateMany({
                  where: {
                    messageId: email.messageId,
                    OR: [
                      { status: { in: ['new', 'failed'] } },
                      { 
                        status: 'processing',
                        updatedAt: { lt: fifteenMinsAgo }
                      }
                    ]
                  },
                  data: { status: 'processing' }
                });
                
                if (result.count === 1) {
                  const existing = await db.incomingEmail.findUnique({
                    where: { messageId: email.messageId }
                  });
                  savedId = existing?.id;
                  claimed = true;
                } else {
                  // Already being processed or already succeeded
                  const existing = await db.incomingEmail.findUnique({
                    where: { messageId: email.messageId }
                  });
                  if (existing?.status === 'processed') {
                    skipped++;
                  }
                }
              } else {
                throw createError;
              }
            }
          }

          if (!claimed) {
            continue;
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

      const result: IngestionResult = { emailsFound, ingested, skipped, failed, status: 'success', enrichmentStatus };
      await finishRun(result);
      return result;
    } catch (error) {
      console.error('Ingestion failed:', error);
      const isImapError = error instanceof Error && 
        (error.message.includes('IMAP') || error.message.includes('connection') || error.message.includes('auth'));
        
      const result: IngestionResult = { 
        emailsFound: 0,
        ingested: 0, 
        skipped: 0, 
        failed: 0, 
        status: isImapError ? 'imap_error' : 'error',
        error: sanitizeIngestionError(error)
      };
      await finishRun(result);
      return result;
    }
  }
}
