import type { QueryClient } from '@tanstack/react-query';

import { clearSession } from '@/features/auth/session';
import { createQueryClient } from '@/lib/query-client';

/** The app's query client: a 401 from any request signs the user out everywhere at once. */
export function createAppQueryClient(): QueryClient {
  return createQueryClient({ onUnauthenticated: clearSession });
}
