import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { authKeys } from '@/features/auth/keys';
import { ApiError, apiRequest } from '@/lib/api-client';
import { signedOut } from '@/test/msw/handlers';
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
      ).toEqual(['Home', 'Search', 'Profile']);
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
    renderRoute('/ana_codes/followers');
    await screen.findByRole('heading', { level: 1, name: 'People following @ana_codes' });

    for (const link of await screen.findAllByRole('link', { name: 'Profile' })) {
      expect(link).toHaveAttribute('aria-current', 'page');
    }
  });

  it('shows no profile links while signed out', async () => {
    server.use(signedOut());
    const { queryClient } = renderRoute('/home');
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    await waitFor(() => {
      expect(queryClient.getQueryState(authKeys.session)?.status).toBe('success');
    });

    expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Your profile' })).not.toBeInTheDocument();
  });

  it('signs out everywhere when any request answers 401', async () => {
    server.use(
      http.get('/api/private', () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue' } },
          { status: 401 },
        ),
      ),
    );
    const { queryClient } = renderRoute('/home');
    await screen.findAllByRole('link', { name: 'Profile' });

    await expect(
      queryClient.fetchQuery({ queryKey: ['private'], queryFn: () => apiRequest('/private') }),
    ).rejects.toBeInstanceOf(ApiError);

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: 'Your profile' })).not.toBeInTheDocument();
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
    const user = userEvent.setup();
    const { router } = renderRoute('/home');
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    const search = screen.getByRole('search', { name: 'Search people' });
    await user.type(within(search).getByRole('searchbox', { name: 'Search people' }), 'ana{Enter}');

    expect(await screen.findByText('People matching “ana” will appear here.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/search');
    expect(router.state.location.search).toBe('?q=ana');
    for (const field of screen.getAllByRole('searchbox', { name: 'Search people' })) {
      expect(field).toHaveValue('ana');
    }
  });
});
