// Prints a Markdown coverage table for every workspace that produced
// coverage/coverage-summary.json (Vitest `json-summary` reporter).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const metrics = ['lines', 'statements', 'functions', 'branches'];
const roots = ['apps', 'packages'];

const rows = roots
  .filter((root) => existsSync(root))
  .flatMap((root) => readdirSync(root).map((name) => join(root, name)))
  .map((dir) => ({ dir, file: join(dir, 'coverage', 'coverage-summary.json') }))
  .filter(({ file }) => existsSync(file))
  .map(({ dir, file }) => {
    const { total } = JSON.parse(readFileSync(file, 'utf8'));
    return `| \`${dir}\` | ${metrics.map((metric) => `${total[metric].pct}%`).join(' | ')} |`;
  });

const title = (metric) => metric[0].toUpperCase() + metric.slice(1);
const lines =
  rows.length === 0
    ? ['## Test coverage', '', '_No coverage reports were produced._']
    : [
        '## Test coverage',
        '',
        `| Workspace | ${metrics.map(title).join(' | ')} |`,
        `|---|${metrics.map(() => '---').join('|')}|`,
        ...rows,
      ];

process.stdout.write(`${lines.join('\n')}\n`);
