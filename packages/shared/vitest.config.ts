import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
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
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: {
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 80,
      },
    },
  },
});
