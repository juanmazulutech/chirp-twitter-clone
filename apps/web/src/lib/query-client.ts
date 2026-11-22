import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { isApiError } from './api-client';

interface QueryClientOptions {
  /** Runs when any request answers 401: the session has ended on the server. */
  onUnauthenticated?: (queryClient: QueryClient) => void;
}

/** A 4xx answer will not change on a second try; a 5xx or a dropped connection might. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

/** Server state lives here (ADR-07); never copy it into a client store. */
export function createQueryClient({ onUnauthenticated }: QueryClientOptions = {}): QueryClient {
  const handleError = (error: unknown) => {
    if (isApiError(error, 401)) onUnauthenticated?.(queryClient);
  };

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
    },
  });
  return queryClient;
}
