import type { Page } from '@chirp/shared';
import { z } from 'zod';

import { ValidationError } from './errors';

/** Position of the last row of a page in `createdAt DESC, id DESC` order (ADR-11). */
export interface Cursor {
  createdAt: Date;
  id: string;
}

const SEPARATOR = '|';

const cursorPartsSchema = z.tuple([z.iso.datetime(), z.uuid()]);

export function encodeCursor({ createdAt, id }: Cursor): string {
  return Buffer.from(`${createdAt.toISOString()}${SEPARATOR}${id}`).toString('base64url');
}

/** Clients may send anything as a cursor, so every failure is a 400, never a 500. */
export function decodeCursor(value: string): Cursor {
  const parts = cursorPartsSchema.safeParse(
    Buffer.from(value, 'base64url').toString('utf8').split(SEPARATOR),
  );
  if (!parts.success) {
    throw new ValidationError('Invalid request', { fieldErrors: { cursor: ['Invalid cursor'] } });
  }
  const [createdAt, id] = parts.data;
  return { createdAt: new Date(createdAt), id };
}

/** The keyset order every list uses; `id` breaks ties between equal timestamps. */
export const newestFirst: [{ createdAt: 'desc' }, { id: 'desc' }] = [
  { createdAt: 'desc' },
  { id: 'desc' },
];

/**
 * Rows strictly after the cursor in `newestFirst` order. It carries its own `OR`, so callers
 * combine it with their filters through `AND` rather than spreading both into one object.
 */
export function keysetAfter(cursor: Cursor | undefined) {
  if (!cursor) return {};
  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ],
  };
}

/** Turns `limit + 1` fetched rows into a page: the extra row only signals that more exist. */
export function toPage<Row extends Cursor, Item>(
  rows: Row[],
  limit: number,
  serialize: (row: Row) => Item,
): Page<Item> {
  const pageRows = rows.slice(0, limit);
  const last = pageRows.at(-1);
  return {
    items: pageRows.map(serialize),
    nextCursor: rows.length > limit && last ? encodeCursor(last) : null,
  };
}
