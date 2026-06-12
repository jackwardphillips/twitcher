import { databaseProvider, prisma } from '../lib/db.js';
import { fail, info, pass, safeErrorMessage } from './ops-utils.js';

async function check() {
  const started = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    pass(`database reachable in ${Date.now() - started}ms`);
    info(`databaseProvider=${databaseProvider}`);
  } catch (error) {
    fail(`database check failed: ${safeErrorMessage(error)}`);
  } finally {
    await prisma.$disconnect();
  }
}

check();
