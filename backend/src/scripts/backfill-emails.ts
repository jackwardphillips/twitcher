import 'dotenv/config';
import { ImapClient } from '../lib/imap-client.js';
import { IngestionService } from '../lib/ingestion-service.js';
import { db } from '../lib/db.js';

async function main() {
  console.log('--- Starting Backfill of eBird Alerts ---');
  
  const imapConfig = {
    host: process.env.IMAP_HOST || '',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    user: process.env.IMAP_USER || '',
    pass: process.env.IMAP_PASS || '',
    secure: process.env.IMAP_SECURE !== 'false',
  };

  if (!imapConfig.user || !imapConfig.pass || !imapConfig.host) {
    console.error('Error: IMAP configuration missing in .env');
    process.exit(1);
  }

  const imapClient = new ImapClient(imapConfig);
  const ingestionService = new IngestionService(imapClient);

  const backfillDate = new Date('2026-01-01');
  console.log(`Backfilling emails since ${backfillDate.toISOString()}...`);

  try {
    const results = await ingestionService.ingest(backfillDate, false);
    console.log('--- Backfill Complete ---');
    console.log(`Ingested: ${results.ingested}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Failed: ${results.failed}`);
  } catch (error) {
    console.error('Backfill failed:', error);
  } finally {
    await db.$disconnect();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
