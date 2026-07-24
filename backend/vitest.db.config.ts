import { defineConfig } from 'vitest/config';
import { unitTestFiles } from './test-tiers';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [
      ...unitTestFiles,
      '**/node_modules/**',
      '**/dist/**',
    ],
    setupFiles: ['./src/test/setup.ts'],
    fileParallelism: false,
  },
});
