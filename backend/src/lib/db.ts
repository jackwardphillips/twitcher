import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const configuredConnectionString = process.env.DATABASE_URL;

if (!configuredConnectionString) {
  throw new Error('DATABASE_URL is required');
}

const connectionString = configuredConnectionString.replace(
  /([?&])sslmode=require(?=&|$)/,
  '$1sslmode=verify-full',
);

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const databaseProvider = 'postgresql';

export { prisma, prisma as db, databaseProvider };
