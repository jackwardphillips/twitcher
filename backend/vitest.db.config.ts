import { defineConfig } from 'vitest/config';
import { smokeTestFiles, unitTestFiles } from './test-tiers';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [
      ...unitTestFiles,
      ...smokeTestFiles,
      '**/node_modules/**',
      '**/dist/**',
    ],
    setupFiles: ['./src/test/setup.ts'],
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
