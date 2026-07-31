import { defineConfig } from 'vitest/config';
import { smokeTestFiles } from './test-tiers';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: smokeTestFiles,
    fileParallelism: false,
  },
});
