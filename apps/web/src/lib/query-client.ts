import { QueryClient } from '@tanstack/react-query';

/** Server state lives here (ADR-07); never copy it into a client store. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
