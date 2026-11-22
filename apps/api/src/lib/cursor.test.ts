import { describe, expect, it } from 'vitest';

import { decodeCursor, encodeCursor, keysetAfter, toPage } from './cursor';
import { ValidationError } from './errors';

const cursor = {
  createdAt: new Date('2026-11-21T10:30:00.123Z'),
  id: '019a0000-0000-7000-8000-000000000001',
};
const base64url = (text: string) => Buffer.from(text).toString('base64url');

describe('cursor', () => {
  it('round-trips a position with millisecond precision', () => {
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it('is URL-safe', () => {
    expect(encodeCursor(cursor)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    ['not base64 at all', '%%%'],
    ['no separator', base64url('2026-11-21T10:30:00.123Z')],
    ['an invalid date', base64url(`yesterday|${cursor.id}`)],
    ['an invalid id', base64url('2026-11-21T10:30:00.123Z|42')],
    ['an extra part', base64url(`2026-11-21T10:30:00.123Z|${cursor.id}|x`)],
  ])('rejects a cursor with %s as a validation error', (_, value) => {
    expect(() => decodeCursor(value)).toThrow(ValidationError);
  });
});

describe('keysetAfter', () => {
  it('filters nothing on the first page', () => {
    expect(keysetAfter(undefined)).toEqual({});
  });

  it('keeps older rows and, on the same timestamp, smaller ids', () => {
    expect(keysetAfter(cursor)).toEqual({
      OR: [
        { createdAt: { lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { lt: cursor.id } },
      ],
    });
  });
});

describe('toPage', () => {
  const rows = [1, 2, 3].map((n) => ({
    createdAt: new Date(Date.UTC(2026, 10, 21, 0, 0, 3 - n)),
    id: `019a0000-0000-7000-8000-00000000000${n}`,
  }));

  it('drops the extra row and points the cursor at the last returned one', () => {
    const page = toPage(rows, 2, (row) => row.id);

    expect(page.items).toEqual([rows[0]?.id, rows[1]?.id]);
    expect(page.nextCursor).not.toBeNull();
    expect(decodeCursor(page.nextCursor ?? '')).toEqual(rows[1]);
  });

  it('has no next cursor when every row fits', () => {
    expect(toPage(rows, 3, (row) => row.id).nextCursor).toBeNull();
  });

  it('returns an empty last page', () => {
    expect(toPage([], 20, (row) => row)).toEqual({ items: [], nextCursor: null });
  });
});
