import { prisma } from '../lib/db.ts';

async function main() {
  await prisma.incomingEmail.updateMany({
    data: { status: 'new' }
  });
  console.log('Reset all email statuses to "new".');
  await prisma.$disconnect();
}

main();
