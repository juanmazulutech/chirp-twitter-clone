import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { followListUserFixture } from '@/test/fixtures';
import { userSearchResults } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

const ana = followListUserFixture({ username: 'ana_codes', displayName: 'Ana Torres' });
const kenji = followListUserFixture({ username: 'kenji_cooks', displayName: 'Kenji Watanabe' });

/** Every search answers with the people whose username or name contains the term. */
function searchablePeople(onTerm: (term: string) => void = () => {}) {
  server.use(
    userSearchResults(
      (term) =>
        [ana, kenji].filter((person) =>
          `${person.username} ${person.displayName}`.toLowerCase().includes(term.toLowerCase()),
        ),
      onTerm,
    ),
  );
}

async function renderSearch(path = '/search') {
  const user = userEvent.setup();
  const rendered = renderRoute(path);
  await screen.findByRole('heading', { level: 1, name: 'Search' });
  // The page's own field (the side panel's copy is hidden by CSS only on desktop).
  const [field] = screen.getAllByRole('searchbox', { name: 'Search people' });
  if (!field) throw new Error('No search field');
  return { user, field, ...rendered };
}

describe('SearchPage', () => {
  it('invites a search before anything is typed, without asking the server', async () => {
    const terms: string[] = [];
    searchablePeople((term) => terms.push(term));
    await renderSearch();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Find people to follow' }),
    ).toBeInTheDocument();
    expect(terms).toEqual([]);
  });

  it('shows matching people once typing pauses, with a single request', async () => {
    const terms: string[] = [];
    searchablePeople((term) => terms.push(term));
    const { user, field, router } = await renderSearch();

    await user.type(field, 'ana');

    const list = await screen.findByRole('list', { name: 'People matching “ana”' });
    expect(within(list).getByRole('article', { name: 'Ana Torres' })).toBeInTheDocument();
    // Kenji Watanabe matches by display name.
    expect(within(list).getByRole('article', { name: 'Kenji Watanabe' })).toBeInTheDocument();
    expect(terms).toEqual(['ana']);
    expect(router.state.location.search).toBe('?q=ana');
    expect(field).toHaveFocus();
  });

  it('runs the search in the address on arrival, without the leading @', async () => {
    const terms: string[] = [];
    searchablePeople((term) => terms.push(term));
    const { field } = await renderSearch('/search?q=%40kenji');

    expect(await screen.findByRole('article', { name: 'Kenji Watanabe' })).toBeInTheDocument();
    expect(field).toHaveValue('@kenji');
    expect(terms).toEqual(['kenji']);
  });

  it('says so when nobody matches', async () => {
    searchablePeople();
    await renderSearch('/search?q=zzz');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'No one matches “zzz”' }),
    ).toBeInTheDocument();
  });

  it('clears the results when the field is emptied', async () => {
    searchablePeople();
    const { user, field, router } = await renderSearch('/search?q=ana');
    await screen.findByRole('list', { name: 'People matching “ana”' });

    await user.clear(field);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Find people to follow' }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('searches at once on Enter', async () => {
    searchablePeople();
    const { user, field, router } = await renderSearch();

    await user.type(field, 'kenji{Enter}');

    expect(router.state.location.search).toBe('?q=kenji');
    expect(await screen.findByRole('article', { name: 'Kenji Watanabe' })).toBeInTheDocument();
  });

  it('follows the address back and forward, field and results alike', async () => {
    searchablePeople();
    const { router, field } = await renderSearch('/search?q=ana');
    await screen.findByRole('article', { name: 'Ana Torres' });

    await router.navigate('/search?q=kenji');

    await waitFor(() => {
      expect(field).toHaveValue('kenji');
    });
    expect(
      await screen.findByRole('list', { name: 'People matching “kenji”' }),
    ).toBeInTheDocument();
  });

  it('follows someone straight from the results', async () => {
    searchablePeople();
    server.use(
      http.post('/api/users/ana_codes/follow', () =>
        HttpResponse.json({ isFollowing: true, followersCount: 4 }),
      ),
    );
    const { user } = await renderSearch('/search?q=ana');
    const row = await screen.findByRole('article', { name: 'Ana Torres' });

    await user.click(within(row).getByRole('button', { name: 'Follow' }));

    expect(within(row).getByRole('button', { name: 'Following' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('offers a retry when the search fails', async () => {
    searchablePeople();
    server.use(http.get('/api/users/search', () => HttpResponse.error(), { once: true }));
    const { user } = await renderSearch('/search?q=ana');

    expect(await screen.findByRole('alert')).toHaveTextContent('People didn’t load');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('article', { name: 'Ana Torres' })).toBeInTheDocument();
  });

  it('opens the results from another page once typing pauses', async () => {
    searchablePeople();
    const user = userEvent.setup();
    const { router } = renderRoute('/home');
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    await user.type(screen.getByRole('searchbox', { name: 'Search people' }), 'ana');

    expect(await screen.findByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?q=ana');
  });
});
