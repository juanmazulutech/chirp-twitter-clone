import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/render';

/** jsdom applies no CSS, so the rail and the bottom bar are both present; each is checked. */
function primaryNavs() {
  return screen.getAllByRole('navigation', { name: 'Primary' });
}

describe('AppShell', () => {
  it('lists the same destinations in the rail and the bottom navigation', async () => {
    renderRoute('/home');
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    const navs = primaryNavs();
    expect(navs).toHaveLength(2);
    for (const nav of navs) {
      expect(
        within(nav)
          .getAllByRole('link')
          .map((link) => link.textContent),
      ).toEqual(['Home', 'Search']);
    }
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
