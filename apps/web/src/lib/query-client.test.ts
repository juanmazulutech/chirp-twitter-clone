import { describe, expect, it } from 'vitest';

import { createQueryClient } from './query-client';

describe('createQueryClient', () => {
  it('caches server data briefly and retries a failed query once', () => {
    const { queries } = createQueryClient().getDefaultOptions();

    expect(queries).toMatchObject({ staleTime: 30_000, retry: 1, refetchOnWindowFocus: false });
  });

  it('creates independent clients', () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });
});
