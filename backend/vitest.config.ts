import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['../tests/backend/tests/setup.ts'],
    testTimeout: 10000,
    include: ['../tests/backend/src/**/*.test.ts', '../tests/backend/tests/**/*.test.ts'],
    exclude: ['../tests/backend/tests/integration/**/*.integration.test.ts', '**/node_modules/**', '**/dist/**'],
  },
});
