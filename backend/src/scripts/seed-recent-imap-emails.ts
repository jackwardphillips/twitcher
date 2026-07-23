import 'dotenv/config';
import { prisma } from '../lib/db.js';
import { ImapClient } from '../lib/imap-client.js';

function getNumberArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const arg = process.argv.find(value => value.startsWith(prefix));
  if (!arg) return fallback;
  const value = Number(arg.slice(prefix.length));
  return Number.isFinite(value) ? value : fallback;
}

async function main() {
  const limit = getNumberArg('limit', 7);
  const days = getNumberArg('days', 30);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const client = new ImapClient({
    host: process.env.IMAP_HOST || '',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    user: process.env.IMAP_USER || '',
    pass: process.env.IMAP_PASS || '',
    secure: process.env.IMAP_SECURE !== 'false',
  });

  const emails = (await client.fetchRecentAlerts(since))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);

  for (const email of emails) {
    await prisma.incomingEmail.upsert({
      where: { messageId: email.messageId },
      create: {
        messageId: email.messageId,
        subject: email.subject,
        from: email.from,
        date: email.date,
        rawBody: email.rawBody,
        status: 'processed',
      },
      update: {
        subject: email.subject,
        from: email.from,
        date: email.date,
        rawBody: email.rawBody,
        status: 'processed',
      },
    });
  }

  console.log(`Seeded ${emails.length} IMAP emails from the last ${days} days.`);
  for (const email of emails) {
    console.log(`${email.date.toISOString()} ${email.subject}`);
  }
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
