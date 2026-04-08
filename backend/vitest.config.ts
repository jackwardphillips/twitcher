import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Make describe, it, expect, etc. globally available
    environment: 'node', // Specify the test environment (e.g., 'node', 'jsdom')
    coverage: {
      provider: 'v8', // Use v8 for coverage
      reporter: ['text', 'json', 'html'],
    },
  },
});
