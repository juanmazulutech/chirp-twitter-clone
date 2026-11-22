import { z } from 'zod';

import { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from '../constants';

/**
 * Query string of every list endpoint. The cursor is opaque to clients: the API alone
 * decodes it, so here it is only bounded in size.
 */
export const pageQuerySchema = z.object({
  cursor: z.string().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
});
export type PageQuery = z.infer<typeof pageQuerySchema>;

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** `{ items, nextCursor }` for any item schema; `nextCursor` is null on the last page. */
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), nextCursor: z.string().nullable() });
}
