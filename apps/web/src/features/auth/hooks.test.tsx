import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { createAppQueryClient } from '@/app/app-query-client';
import { sessionUser } from '@/test/fixtures';
import { signedOut } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';

import { useSession } from './hooks';

function renderSession() {
  const queryClient = createAppQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useSession(), { wrapper });
}

describe('useSession', () => {
  it('is pending until the session is known', () => {
    const { result } = renderSession();

    expect(result.current).toEqual({ user: null, isPending: true, isError: false });
  });

  it('returns the signed-in user', async () => {
    const { result } = renderSession();

    await waitFor(() => {
      expect(result.current.user).toEqual(sessionUser);
    });
    expect(result.current.isError).toBe(false);
  });

  it('treats a 401 as being signed out, not as an error', async () => {
    server.use(signedOut());
    const { result } = renderSession();

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
    expect(result.current).toEqual({ user: null, isPending: false, isError: false });
  });

  it('reports a server failure as an error', async () => {
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
          { status: 500 },
        ),
      ),
    );
    const { result } = renderSession();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.user).toBeNull();
  });
});
