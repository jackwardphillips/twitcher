import { beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { clearDatabase } from './db-utils';
import { server } from './mocks/server';

beforeAll(async () => {
  // Start msw server
  server.listen({ onUnhandledRequest: 'warn' });
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
