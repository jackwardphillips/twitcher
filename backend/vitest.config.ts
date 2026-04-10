import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Make describe, it, expect, etc. globally available
    environment: 'node', // Specify the test environment (e.g., 'node', 'jsdom')
    exclude: ['**/node_modules/**', '**/dist/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**', '**/{karma,rollup,webpack,vite,vitest,ava,babel,nyc,cypress,tsup,build}.config.*'],
    coverage: {
      provider: 'v8', // Use v8 for coverage
      reporter: ['text', 'json', 'html'],
    },
  },
});
