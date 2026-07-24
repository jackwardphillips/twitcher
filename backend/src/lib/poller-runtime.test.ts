import { afterEach, describe, expect, it } from 'vitest';
import { validateProductionPollerEnvironment } from './poller-runtime.js';

describe('production poller preflight', () => {
  const originalGroqKey = process.env.GROQ_API_KEY;

  afterEach(() => {
    if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalGroqKey;
  });

  it('fails before production work when GROQ_API_KEY is missing', () => {
    delete process.env.GROQ_API_KEY;
    expect(() => validateProductionPollerEnvironment(true))
      .toThrow('GROQ_API_KEY is required for production polling');
  });

  it('does not require Groq for dry-run polling', () => {
    delete process.env.GROQ_API_KEY;
    expect(() => validateProductionPollerEnvironment(false)).not.toThrow();
  });
});
