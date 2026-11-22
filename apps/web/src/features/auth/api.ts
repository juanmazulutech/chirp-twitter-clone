import { sessionResponseSchema, type SessionUser } from '@chirp/shared';

import { apiRequest, isApiError } from '@/lib/api-client';

/** The signed-in user, or `null` when there is no session: being signed out is not an error. */
export async function fetchSession(signal?: AbortSignal): Promise<SessionUser | null> {
  try {
    const { user } = await apiRequest('/auth/me', { schema: sessionResponseSchema, signal });
    return user;
  } catch (error) {
    if (isApiError(error, 401)) return null;
    throw error;
  }
}
