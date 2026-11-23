import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { authKeys } from '@/features/auth/keys';
import { returnToPath } from '@/features/auth/return-to';
import { followListUserFixture, profileFixture } from '@/test/fixtures';
import { followListPages, profileFound, signedOut, userSearchResults } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

/** jsdom applies no CSS, so the rail and the bottom bar are both present; each is checked. */
function primaryNavs() {
  return screen.getAllByRole('navigation', { name: 'Primary' });
}

describe('AppShell', () => {
  it('lists the same destinations in the rail and the bottom navigation', async () => {
    renderRoute('/home');
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    await screen.findAllByRole('link', { name: 'Profile' });

    const navs = primaryNavs();
    expect(navs).toHaveLength(2);
    for (const nav of navs) {
      expect(
        within(nav)
          .getAllByRole('link')
          .map((link) => link.textContent),
      ).toEqual(['Home', 'Search', 'Notifications', 'Profile']);
    }
  });

  it('links Profile and the header avatar to the signed-in user', async () => {
    renderRoute('/home');

    for (const link of await screen.findAllByRole('link', { name: 'Profile' })) {
      expect(link).toHaveAttribute('href', '/ana_codes');
    }
    expect(screen.getByRole('link', { name: 'Your profile' })).toHaveAttribute(
      'href',
      '/ana_codes',
    );
  });

  it('marks Profile as current on your own profile and its lists', async () => {
    server.use(
      profileFound(
        profileFixture({ username: 'ana_codes', displayName: 'Ana Torres', isMe: true }),
      ),
      followListPages('ana_codes', 'followers'),
    );
    renderRoute('/ana_codes/followers');
    await screen.findByRole('heading', { level: 1, name: 'Ana Torres' });

    for (const link of await screen.findAllByRole('link', { name: 'Profile' })) {
      expect(link).toHaveAttribute('aria-current', 'page');
    }
  });

  it.each([
    ['rail', 0],
    ['header', 1],
  ])('signs out from the %s and opens sign-in with nothing to return to', async (_place, index) => {
    let signedOutOnServer = false;
    server.use(
      http.post('/api/auth/logout', () => {
        signedOutOnServer = true;
        server.use(signedOut());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    const { router, queryClient } = renderRoute('/search?q=ana');
    await screen.findByRole('heading', { level: 1, name: 'Search' });
    queryClient.setQueryData(['private'], 'cached for this account');

    const signOut = screen.getAllByRole('button', { name: 'Sign out' })[index];
    if (!signOut) throw new Error('expected a sign-out button');
    await user.click(signOut);

    await screen.findByRole('heading', { level: 1, name: 'Sign in to Chirp' });
    expect(signedOutOnServer).toBe(true);
    expect(router.state.location.pathname).toBe('/login');
    // Leaving was deliberate: signing in again opens home, not the page left behind.
    expect(returnToPath(router.state.location.state)).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument();
    expect(queryClient.getQueryData(authKeys.session)).toBeNull();
    expect(queryClient.getQueryData(['private'])).toBeUndefined();
  });

  it('stays signed in and says so when signing out fails', async () => {
    server.use(http.post('/api/auth/logout', () => HttpResponse.error()));
    const user = userEvent.setup();
    const { router } = renderRoute('/home');
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    const [signOut] = screen.getAllByRole('button', { name: 'Sign out' });
    if (!signOut) throw new Error('expected a sign-out button');
    await user.click(signOut);

    expect(
      await screen.findByText('Couldn’t sign out. Check your connection and try again.'),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/home');
    expect(screen.getAllByRole('link', { name: 'Profile' }).length).toBeGreaterThan(0);
  });

  it('marks the sign-out button busy while it waits for the server', async () => {
    let respond: () => void = () => {};
    server.use(
      http.post(
        '/api/auth/logout',
        () =>
          new Promise<Response>((resolve) => {
            respond = () => {
              resolve(new HttpResponse(null, { status: 204 }));
            };
          }),
      ),
    );
    const user = userEvent.setup();
    renderRoute('/home');
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    const [railSignOut] = screen.getAllByRole('button', { name: 'Sign out' });
    if (!railSignOut) throw new Error('expected a sign-out button');
    await user.click(railSignOut);

    expect(railSignOut).toHaveAttribute('aria-busy', 'true');
    expect(railSignOut).toBeDisabled();
    respond();
    await screen.findByRole('heading', { level: 1, name: 'Sign in to Chirp' });
  });

  it('marks the current page in every navigation, not only with colour', async () => {
    renderRoute('/search');
    await screen.findByRole('heading', { level: 1, name: 'Search' });

    for (const nav of primaryNavs()) {
      expect(within(nav).getByRole('link', { name: 'Search' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
    }
  });

  it('navigates between pages from the navigation', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/home');
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    const [rail] = primaryNavs();
    if (!rail) throw new Error('expected a primary navigation');
    await user.click(within(rail).getByRole('link', { name: 'Search' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/search');
  });

  it('offers a skip link to the main content', async () => {
    renderRoute('/home');
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });

  it.each([0, 1])('opens and closes the compose modal from compose button %i', async (index) => {
    const user = userEvent.setup();
    renderRoute('/home');
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    const composeButton = screen.getAllByRole('button', { name: 'New chirp' })[index];
    if (!composeButton) throw new Error('expected a compose button');
    await user.click(composeButton);

    const dialog = screen.getByRole('dialog', { name: 'New chirp' });
    expect(dialog).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'New chirp' })).not.toBeInTheDocument();
  });

  it('searches people from the side panel', async () => {
    server.use(
      userSearchResults(() => [
        followListUserFixture({ username: 'ana_codes', displayName: 'Ana' }),
      ]),
    );
    const user = userEvent.setup();
    const { router } = renderRoute('/home');
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    const search = screen.getByRole('search', { name: 'Search people' });
    await user.type(within(search).getByRole('searchbox', { name: 'Search people' }), 'ana{Enter}');

    expect(await screen.findByRole('list', { name: 'People matching “ana”' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/search');
    expect(router.state.location.search).toBe('?q=ana');
    for (const field of screen.getAllByRole('searchbox', { name: 'Search people' })) {
      expect(field).toHaveValue('ana');
    }
  });
});
