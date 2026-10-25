import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // NFR-P1: initial JS payload under 500 KB gzipped.
    chunkSizeWarningLimit: 500,
  },
  server: {
    // Generated output is not source: without this, running the coverage suite
    // while the dev server is up reloads the page once per report file.
    watch: { ignored: ['**/coverage/**', '**/dist/**'] },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      // NFR-M1: 90% lines on the algorithm core only; presentational
      // components are excluded from the target. Restricted to TS sources so
      // non-code markers (e.g. .gitkeep) do not appear in the report.
      include: ['src/core/**/*.{ts,tsx}'],
      thresholds: { lines: 90 },
    },
  },
})
