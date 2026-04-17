import { describe, it, expect } from 'vitest';
import 'dotenv/config';

describe('Configuration', () => {
  it('should have GEMINI_API_KEY defined', () => {
    expect(process.env.GEMINI_API_KEY).toBeDefined();
    expect(process.env.GEMINI_API_KEY).not.toBe('');
  });
});
