import { beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { clearDatabase } from './db-utils';
import { server } from './mocks/server';
import { db } from '../lib/db';
import {
  validateConnectedIdentity,
  validateTestDatabaseEnvironment,
} from '../../test-db-guard.js';

beforeAll(async () => {
  const target = validateTestDatabaseEnvironment(process.env);
  if (process.env.DATABASE_URL !== target.rawUrl) {
    throw new Error('DATABASE_URL must exactly match the guarded TEST_DATABASE_URL.');
  }
  const [identity] = await db.$queryRawUnsafe<Array<{ database: string; role: string }>>(
    'SELECT current_database() AS "database", current_user AS "role"',
  );
  if (!identity) {
    throw new Error('Could not verify the connected test database identity.');
  }
  validateConnectedIdentity(target, identity);

  // Start msw server
  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(async () => {
  await clearDatabase();
});

afterEach(() => {
  // Reset handlers to default after each test
  server.resetHandlers();
});

afterAll(() => {
  // Close msw server
  server.close();
});
