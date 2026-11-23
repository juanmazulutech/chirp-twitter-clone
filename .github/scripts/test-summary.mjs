// Prints the CI job summary for the unit and integration tests: one row per workspace with its
// test results (Vitest `json` reporter, test-results/vitest.json) and coverage (`json-summary`,
// coverage/coverage-summary.json), then every failed test. Coverage floors are read from each
// workspace's Vitest config, so they are never restated here.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const metrics = ['lines', 'statements', 'functions', 'branches'];
const configNames = ['vitest.config.ts', 'vite.config.ts'];

const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);

const acronyms = new Set(['api']);

/** "@chirp/api" -> "API", "@chirp/web" -> "Web". */
function displayName(dir) {
  const name = readJson(join(dir, 'package.json'))?.name ?? dir;
  const short = name.split('/').pop();
  return acronyms.has(short) ? short.toUpperCase() : short[0].toUpperCase() + short.slice(1);
}

/** { lines: 85, functions: 85, statements: 85, branches: 80 } -> "85% (branches 80%)". */
function describeFloors(floors) {
  const set = metrics.filter((metric) => typeof floors[metric] === 'number');
  if (set.length === 0) return null;
  const counts = Map.groupBy(set, (metric) => floors[metric]);
  const [base] = [...counts].sort((a, b) => b[1].length - a[1].length)[0];
  const others = set.filter((metric) => floors[metric] !== base);
  const extra = others.map((metric) => `${metric} ${floors[metric]}%`).join(', ');
  return others.length > 0 ? `${base}% (${extra})` : `${base}%`;
}

async function coverageFloors(dir) {
  const configFile = configNames.map((name) => join(dir, name)).find(existsSync);
  if (!configFile) return {};
  try {
    const { default: config } = await import(pathToFileURL(resolve(configFile)).href);
    return config?.test?.coverage?.thresholds ?? {};
  } catch {
    // Without the floors the table still shows the figures, just without the warning marks.
    return {};
  }
}

const seconds = (ms) =>
  ms >= 10_000 ? `${Math.round(ms / 1000)} s` : `${(ms / 1000).toFixed(1)} s`;
const percent = (value) => `${Number.isInteger(value) ? value : value.toFixed(1)}%`;

function testCell(results) {
  const parts = [`${results.numPassedTests} passed`];
  if (results.numFailedTests > 0) parts.push(`**${results.numFailedTests} failed**`);
  const skipped = results.numPendingTests + results.numTodoTests;
  if (skipped > 0) parts.push(`${skipped} skipped`);
  return parts.join(', ');
}

function duration(results) {
  const ends = results.testResults.map((file) => file.endTime).filter(Number.isFinite);
  return ends.length > 0 ? seconds(Math.max(...ends) - results.startTime) : '–';
}

const workspaces = ['apps', 'packages']
  .filter((root) => existsSync(root))
  .flatMap((root) => readdirSync(root).map((name) => join(root, name)))
  .filter((dir) => existsSync(join(dir, 'package.json')));

const rows = [];
const failures = [];
const floorNotes = [];
let allPassed = true;

for (const dir of workspaces) {
  const results = readJson(join(dir, 'test-results', 'vitest.json'));
  const coverage = readJson(join(dir, 'coverage', 'coverage-summary.json'))?.total;
  if (!results && !coverage) continue;

  const floors = await coverageFloors(dir);
  const passed = results ? results.success && results.numFailedTests === 0 : false;
  allPassed &&= passed;

  const coverageCells = metrics.map((metric) => {
    if (!coverage) return '–';
    const value = coverage[metric].pct;
    const below = typeof floors[metric] === 'number' && value < floors[metric];
    return below ? `⚠️ ${percent(value)}` : percent(value);
  });
  rows.push(
    `| ${passed ? '✅' : '❌'} ${displayName(dir)} (\`${dir}\`) | ${
      results ? testCell(results) : '_no results_'
    } | ${results ? results.testResults.length : '–'} | ${
      results ? duration(results) : '–'
    } | ${coverageCells.join(' | ')} |`,
  );

  const floorText = describeFloors(floors);
  if (floorText) floorNotes.push(`${displayName(dir)} ${floorText}`);

  for (const file of results?.testResults ?? []) {
    const failed = file.assertionResults.filter((test) => test.status === 'failed');
    // A file can fail before any test runs (an import or setup error).
    if (failed.length === 0 && file.status === 'failed') {
      failures.push({
        dir,
        file: file.name,
        title: '(the file failed to run)',
        message: file.message,
      });
    }
    for (const test of failed) {
      failures.push({
        dir,
        file: file.name,
        title: test.fullName,
        message: test.failureMessages[0],
      });
    }
  }
}

const firstLine = (message = '') => message.split('\n').find((line) => line.trim()) ?? '';
const lines = [`## Unit and integration tests ${allPassed ? '✅' : '❌'}`, ''];

if (rows.length === 0) {
  lines.push('_No test results were produced._');
} else {
  lines.push(
    '| Workspace | Tests | Files | Time | Lines | Statements | Functions | Branches |',
    '|---|---|---:|---:|---:|---:|---:|---:|',
    ...rows,
  );
  if (floorNotes.length > 0) {
    lines.push(
      '',
      `Coverage floors: ${floorNotes.join(' · ')}. ⚠️ marks a figure below its floor.`,
    );
  }
}

if (failures.length > 0) {
  lines.push('', `### Failed tests (${failures.length})`, '');
  for (const failure of failures) {
    const file = relative(process.cwd(), failure.file);
    lines.push(
      '<details>',
      `<summary>❌ ${failure.title} <code>${file}</code></summary>`,
      '',
      '```',
      firstLine(failure.message).slice(0, 500),
      '```',
      '</details>',
    );
  }
}

process.stdout.write(`${lines.join('\n')}\n`);
