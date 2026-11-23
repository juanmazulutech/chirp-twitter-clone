import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

// The production Content-Security-Policy (nginx) allows inline code by hash only. Changing the
// inline script in index.html, or upgrading Sonner, silently breaks the page in production
// unless the hashes in the policy follow; these tests catch it in `verify` instead.

const webRoot = join(import.meta.dirname, '..');
const headers = readFileSync(join(import.meta.dirname, 'security-headers.inc.template'), 'utf8');
const policy = /add_header Content-Security-Policy "([^"]+)"/.exec(headers)?.[1] ?? '';

const cspHash = (source: string) =>
  `'sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}'`;

/** The policy's sources for one directive, e.g. `script-src`. */
function directive(name: string): string[] {
  const entry = policy
    .split(';')
    .map((part) => part.trim().split(' '))
    .find(([directiveName]) => directiveName === name);
  return entry?.slice(1) ?? [];
}

function inlineScripts(): string[] {
  const html = readFileSync(join(webRoot, 'index.html'), 'utf8');
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1] ?? '');
}

/** The stylesheet Sonner appends to <head> when it loads (a JSON-compatible string literal). */
function sonnerStylesheet(): string {
  const entry = join(dirname(createRequire(import.meta.url).resolve('sonner')), 'index.mjs');
  const literal = /__insertCSS\(("(?:[^"\\]|\\.)*")\)/.exec(readFileSync(entry, 'utf8'))?.[1];
  if (literal === undefined) throw new Error('Sonner no longer injects its stylesheet this way');
  return parseStringLiteral(literal);
}

function parseStringLiteral(literal: string): string {
  const value: unknown = JSON.parse(literal);
  if (typeof value !== 'string') throw new Error('Expected a string literal');
  return value;
}

describe('production content security policy', () => {
  it('allows the inline scripts of index.html by hash', () => {
    const scripts = inlineScripts();
    expect(scripts).toHaveLength(1);
    expect(directive('script-src')).toEqual(["'self'", ...scripts.map(cspHash)]);
  });

  it("allows Sonner's injected stylesheet by hash and no other inline style", () => {
    expect(directive('style-src')).toEqual(["'self'", cspHash(sonnerStylesheet())]);
  });

  it('never falls back to unsafe-inline or unsafe-eval', () => {
    expect(policy).not.toMatch(/unsafe-/);
  });
});
