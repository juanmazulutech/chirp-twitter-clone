import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// The browser only ever talks to this origin; `/api` is forwarded to the API (ADR-17).
// The end-to-end suite points it at its own API instance (e2e/stack.ts).
const apiProxy = { '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000' } };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true, proxy: apiProxy },
  preview: { port: 4173, strictPort: true, proxy: apiProxy },
  test: {
    environment: 'jsdom',
    // nginx/*.test.ts check the production web server's configuration (CSP hashes).
    include: ['src/**/*.test.{ts,tsx}', 'nginx/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    // On GitHub Actions: failures stay as inline annotations, but the job summary is written once
    // for every workspace by .github/scripts/test-summary.mjs, from this JSON report.
    reporters: process.env.GITHUB_ACTIONS
      ? ['default', ['github-actions', { jobSummary: { enabled: false } }], 'json']
      : ['default'],
    outputFile: { json: 'test-results/vitest.json' },
    coverage: {
      provider: 'v8',
      // json-summary feeds the CI job summary (.github/scripts/test-summary.mjs).
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        // Entry point: mounts the app into the DOM; behavior lives in App.
        'src/main.tsx',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 70,
      },
    },
  },
});
