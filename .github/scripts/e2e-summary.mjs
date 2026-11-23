// Prints the CI job summary for the end-to-end suite from Playwright's JSON report
// (apps/web/test-results/e2e.json): totals, one row per test, and the error of every failure.
import { existsSync, readFileSync } from 'node:fs';
import { stripVTControlCharacters } from 'node:util';

const reportFile = process.argv[2] ?? 'apps/web/test-results/e2e.json';
const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;
const icons = { expected: '✅', unexpected: '❌', flaky: '⚠️', skipped: '⏭️' };
const words = { expected: 'passed', unexpected: 'failed', flaky: 'flaky', skipped: 'skipped' };

/** Every test with its spec file, walking nested `describe` blocks. */
function collect(suite, file = suite.file, titles = []) {
  const here = suite.file && !file ? suite.file : file;
  const path = suite.title && suite.title !== here ? [...titles, suite.title] : titles;
  return [
    ...(suite.specs ?? []).flatMap((spec) =>
      spec.tests.map((test) => ({ file: here, title: [...path, spec.title].join(' › '), test })),
    ),
    ...(suite.suites ?? []).flatMap((child) => collect(child, here, path)),
  ];
}

const lines = [];

if (!existsSync(reportFile)) {
  lines.push(
    '## End-to-end tests ❌',
    '',
    '_No Playwright report was produced (the run stopped early)._',
  );
} else {
  const report = JSON.parse(readFileSync(reportFile, 'utf8'));
  const { stats } = report;
  const tests = report.suites.flatMap((suite) => collect(suite));
  const projects = [...new Set(tests.map(({ test }) => test.projectName))].join(', ');
  const ok = stats.unexpected === 0 && report.errors.length === 0;

  lines.push(
    `## End-to-end tests ${ok ? '✅' : '❌'}`,
    '',
    `${stats.expected} passed · ${stats.unexpected} failed · ${stats.flaky} flaky · ${stats.skipped} skipped · ${seconds(stats.duration)} · ${projects}`,
    '',
    '| Spec | Test | Result | Time |',
    '|---|---|---|---:|',
    ...tests.map(({ file, title, test }) => {
      const last = test.results.at(-1);
      const retryCount = test.results.length - 1;
      const retries =
        retryCount > 0 ? ` (after ${retryCount} ${retryCount === 1 ? 'retry' : 'retries'})` : '';
      return `| ${file.replace(/\.spec\.ts$/, '')} | ${title} | ${icons[test.status]} ${words[test.status]}${retries} | ${last ? seconds(last.duration) : '–'} |`;
    }),
  );

  const failed = tests.filter(({ test }) => test.status === 'unexpected');
  const runErrors = report.errors.map((error) => error.message ?? String(error));
  if (failed.length > 0 || runErrors.length > 0) {
    lines.push('', '### Failures', '');
    for (const { file, title, test } of failed) {
      const message = test.results.at(-1)?.error?.message ?? '';
      lines.push(
        '<details>',
        `<summary>❌ ${title} <code>${file}</code></summary>`,
        '',
        '```',
        stripVTControlCharacters(message).slice(0, 1500),
        '```',
        '</details>',
      );
    }
    for (const message of runErrors) {
      lines.push('```', stripVTControlCharacters(message).slice(0, 1500), '```');
    }
    lines.push(
      '',
      'Traces, screenshots and the HTML report are in the **playwright-report** artifact of this run.',
    );
  }
}

process.stdout.write(`${lines.join('\n')}\n`);
