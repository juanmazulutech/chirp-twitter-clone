import { z } from 'zod';

import { SEARCH_QUERY_MAX_LENGTH } from '../constants';
import { pageQuerySchema } from './pagination';

/**
 * What people type to find someone: trimmed, and a leading "@" dropped, so "@ana" and "ana"
 * search alike. Measured after that cleanup.
 */
export const searchTermSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@/, '').trim())
  .pipe(
    z
      .string()
      .min(1, 'Type a name or @username')
      .max(SEARCH_QUERY_MAX_LENGTH, `Use at most ${SEARCH_QUERY_MAX_LENGTH} characters`),
  );

export const userSearchQuerySchema = pageQuerySchema.extend({ q: searchTermSchema });
export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>;
