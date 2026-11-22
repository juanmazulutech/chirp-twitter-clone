import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiRequest } from '@/lib/api-client';
import { authResponse } from '@/test/fixtures';
import { apiError } from '@/test/msw/errors';
import { server } from '@/test/msw/server';
import { startSignedOut } from '@/test/msw/session';
import { renderRoute } from '@/test/render';

const DEMO = { email: 'ana@chirp.dev', password: 'Password123!' };

/** The sign-in form's success path, answering the way the API does. */
async function signIn(user: ReturnType<typeof userEvent.setup>, session: { signIn(): void }) {
  server.use(
    http.post('/api/auth/login', () => {
      session.signIn();
      return HttpResponse.json(authResponse);
    }),
  );
  await user.type(screen.getByRole('textbox', { name: 'Email' }), DEMO.email);
  await user.type(screen.getByLabelText('Password'), DEMO.password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('ProtectedRoute', () => {
  it('sends a signed-out visitor to sign-in, then back to the page they asked for', async () => {
    const session = startSignedOut();
    const user = userEvent.setup();
    const { router } = renderRoute('/ana_codes/followers?from=link');

    await screen.findByRole('heading', { level: 1, name: 'Sign in to Chirp' });
    expect(router.state.location.pathname).toBe('/login');
    expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument();

    await signIn(user, session);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'People following @ana_codes' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/ana_codes/followers');
    expect(router.state.location.search).toBe('?from=link');
  });

  it('signs out everywhere when any request answers 401, and returns after signing in', async () => {
    const user = userEvent.setup();
    const { router, queryClient } = renderRoute('/search?q=ana');
    await screen.findByRole('heading', { level: 1, name: 'Search' });

    // The session expired on the server: every later request is refused.
    const session = startSignedOut();
    server.use(
      http.get('/api/private', () => apiError(401, 'UNAUTHENTICATED', 'Sign in to continue')),
    );
    await expect(
      queryClient.fetchQuery({ queryKey: ['private'], queryFn: () => apiRequest('/private') }),
    ).rejects.toMatchObject({ status: 401 });

    await screen.findByRole('heading', { level: 1, name: 'Sign in to Chirp' });
    expect(router.state.location.pathname).toBe('/login');

    await signIn(user, session);

    expect(await screen.findByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?q=ana');
    // The previous session's data is gone; only the new session remains cached.
    expect(queryClient.getQueryCache().find({ queryKey: ['private'] })).toBeUndefined();
  });

  it('waits for the session before showing anything', async () => {
    let respond: (() => void) | undefined;
    server.use(
      http.get(
        '/api/auth/me',
        () =>
          new Promise<Response>((resolve) => {
            respond = () => {
              resolve(apiError(401, 'UNAUTHENTICATED', 'Sign in to continue'));
            };
          }),
      ),
    );
    const { router } = renderRoute('/home');

    // The guard asks once the page's code has loaded; until it hears back, only a spinner.
    await waitFor(() => {
      expect(respond).toBeDefined();
    });
    expect(screen.getByRole('img', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Home' })).not.toBeInTheDocument();

    respond?.();
    await screen.findByRole('heading', { level: 1, name: 'Sign in to Chirp' });
    expect(router.state.location.pathname).toBe('/login');
  });

  it('shows an error, not the sign-in screen, when the session cannot be checked', async () => {
    server.use(
      http.get('/api/auth/me', () => apiError(500, 'INTERNAL_ERROR', 'Something went wrong')),
    );
    const { router } = renderRoute('/home');

    expect(await screen.findByRole('alert')).toHaveTextContent('This page didn’t load');
    expect(router.state.location.pathname).toBe('/home');
  });
});

describe('GuestRoute', () => {
  it.each(['/login', '/register'])('sends someone signed in from %s to home', async (path) => {
    const { router } = renderRoute(path);

    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/home');
  });

  it('still opens search after creating an account, wherever the visitor came from', async () => {
    const session = startSignedOut();
    server.use(
      http.post('/api/auth/register', () => {
        session.signIn();
        return HttpResponse.json(authResponse, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    const { router } = renderRoute('/notifications');
    await screen.findByRole('heading', { level: 1, name: 'Sign in to Chirp' });

    await user.click(screen.getByRole('link', { name: 'Create an account' }));
    await screen.findByRole('heading', { level: 1, name: 'Create your account' });
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ana Torres');
    await user.type(screen.getByRole('textbox', { name: 'Username' }), 'ana_codes');
    await user.type(screen.getByRole('textbox', { name: 'Email' }), DEMO.email);
    await user.type(screen.getByLabelText('Password'), DEMO.password);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/search');
  });
});

describe('SessionRedirect', () => {
  it('opens the timeline at the root address when signed in', async () => {
    const { router } = renderRoute('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/home');
  });

  it('opens sign-in at the root address when signed out, with nothing to return to', async () => {
    startSignedOut();
    const { router } = renderRoute('/');

    await screen.findByRole('heading', { level: 1, name: 'Sign in to Chirp' });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
    expect(router.state.location.state).toBeNull();
  });
});
