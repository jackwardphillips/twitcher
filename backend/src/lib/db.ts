import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const connectionString = process.env.DATABASE_URL || 'file:./dev.db';
const path = connectionString.startsWith('file:') ? connectionString.substring(5) : connectionString;

const adapter = new PrismaBetterSqlite3({ url: path });
const prisma = new PrismaClient({ adapter });

export { prisma, prisma as db };