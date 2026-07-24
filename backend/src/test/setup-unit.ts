import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';
import { rejectUnhandledExternalRequest } from './network-policy';

beforeAll(() => {
  server.listen({ onUnhandledRequest: rejectUnhandledExternalRequest });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
