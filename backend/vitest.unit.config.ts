import { defineConfig } from 'vitest/config';
import { unitTestFiles } from './test-tiers';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: unitTestFiles,
    setupFiles: ['./src/test/setup-unit.ts'],
    fileParallelism: false,
  },
});
