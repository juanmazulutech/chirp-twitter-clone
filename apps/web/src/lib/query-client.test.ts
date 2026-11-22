import { describe, expect, it, vi } from 'vitest';

import { ApiError } from './api-client';
import { createQueryClient, shouldRetry } from './query-client';

const apiError = (status: number) =>
  new ApiError({ status, code: status >= 500 ? 'INTERNAL_ERROR' : 'NOT_FOUND', message: 'x' });

describe('createQueryClient', () => {
  it('caches server data briefly and never refetches on focus', () => {
    const { queries } = createQueryClient().getDefaultOptions();

    expect(queries).toMatchObject({ staleTime: 30_000, refetchOnWindowFocus: false });
  });

  it('creates independent clients', () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });

  it('reports a 401 from a query or a mutation', async () => {
    const onUnauthenticated = vi.fn();
    const queryClient = createQueryClient({ onUnauthenticated });
    const unauthenticated = () => Promise.reject(apiError(401));

    await queryClient
      .fetchQuery({ queryKey: ['private'], queryFn: unauthenticated, retry: false })
      .catch(() => undefined);
    await queryClient
      .getMutationCache()
      .build(queryClient, { mutationFn: unauthenticated })
      .execute(undefined)
      .catch(() => undefined);

    expect(onUnauthenticated).toHaveBeenCalledTimes(2);
    expect(onUnauthenticated).toHaveBeenCalledWith(queryClient);
  });

  it('ignores errors other than 401', async () => {
    const onUnauthenticated = vi.fn();
    const queryClient = createQueryClient({ onUnauthenticated });

    await queryClient
      .fetchQuery({ queryKey: ['x'], queryFn: () => Promise.reject(apiError(403)), retry: false })
      .catch(() => undefined);

    expect(onUnauthenticated).not.toHaveBeenCalled();
  });
});

describe('shouldRetry', () => {
  it.each([400, 401, 403, 404, 409, 429])('never retries a %i', (status) => {
    expect(shouldRetry(0, apiError(status))).toBe(false);
  });

  it('retries a server error or a dropped connection once', () => {
    expect(shouldRetry(0, apiError(500))).toBe(true);
    expect(shouldRetry(0, new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'x' }))).toBe(
      true,
    );
    expect(shouldRetry(1, apiError(500))).toBe(false);
  });
});
