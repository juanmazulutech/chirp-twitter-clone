import { followListUserSchema, pageSchema } from '@chirp/shared';

import { apiRequest } from '@/lib/api-client';

const resultPageSchema = pageSchema(followListUserSchema);

/** One page of people matching `term`, best matches first. */
export function searchUsers(term: string, cursor: string | undefined, signal?: AbortSignal) {
  const query = new URLSearchParams({ q: term });
  if (cursor) query.set('cursor', cursor);
  return apiRequest(`/users/search?${query.toString()}`, { schema: resultPageSchema, signal });
}
