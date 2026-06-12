import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const isSqliteUrl = connectionString === ':memory:' || connectionString.startsWith('file:');
const adapter = isSqliteUrl
  ? new PrismaBetterSqlite3({ url: connectionString.replace(/^file:/, '') })
  : new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const databaseProvider = isSqliteUrl ? 'sqlite' : 'postgresql';

export { prisma, prisma as db, databaseProvider };
