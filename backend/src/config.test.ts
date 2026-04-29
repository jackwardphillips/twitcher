import { describe, it, expect } from 'vitest';
import 'dotenv/config';

describe('Configuration', () => {
  it('should have DATABASE_URL defined for tests', () => {
    // In vitest.config.ts, DATABASE_URL is set to file:./test.db
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.DATABASE_URL).toContain('test.db');
  });
});
