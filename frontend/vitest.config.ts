import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['../tests/frontend/**/*.test.ts', '../tests/frontend/**/*.test.tsx'],
    exclude: ['../tests/frontend/**/*.test.mjs', '**/node_modules/**', '**/dist/**'],
  },
})
