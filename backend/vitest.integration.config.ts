import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['../tests/backend/tests/integration/setup.ts'],
    include: ['../tests/backend/tests/integration/**/*.integration.test.ts'],
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
