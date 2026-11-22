import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { followListUserFixture, profileFixture, sessionUser } from '@/test/fixtures';
import { scrollToEnd } from '@/test/intersection-observer';
import { followListPages, profileFound } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

const bruno = profileFixture();

async function renderList(path: string) {
  const user = userEvent.setup();
  const rendered = renderRoute(path);
  await screen.findByRole('heading', { level: 1, name: bruno.displayName });
  return { user, ...rendered };
}

describe('FollowListPage', () => {
  it('lists the followers under the current tab', async () => {
    const carla = followListUserFixture({ username: 'carla', displayName: 'Carla' });
    server.use(profileFound(bruno), followListPages('bruno', 'followers', [[carla]]));
    await renderList('/bruno/followers');

    const tabs = screen.getByRole('navigation', { name: 'Follow lists' });
    expect(within(tabs).getByRole('link', { name: 'Followers' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(tabs).getByRole('link', { name: 'Following' })).not.toHaveAttribute(
      'aria-current',
    );
    const list = await screen.findByRole('list', { name: 'People following Bruno Silva' });
    const row = within(list).getByRole('article', { name: 'Carla' });
    expect(within(row).getByRole('link', { name: 'Carla' })).toHaveAttribute('href', '/carla');
    expect(within(row).getByText('@carla')).toBeInTheDocument();
    expect(screen.getByText('That’s everyone.')).toBeInTheDocument();
  });

  it('switches to the people they follow', async () => {
    server.use(
      profileFound(bruno),
      followListPages('bruno', 'followers', [[followListUserFixture({ displayName: 'Carla' })]]),
      followListPages('bruno', 'following', [[followListUserFixture({ displayName: 'Dave' })]]),
    );
    const { user, router } = await renderList('/bruno/followers');
    await screen.findByRole('list', { name: 'People following Bruno Silva' });

    await user.click(screen.getByRole('link', { name: 'Following' }));

    const list = await screen.findByRole('list', { name: 'People Bruno Silva follows' });
    expect(within(list).getByRole('article', { name: 'Dave' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/bruno/following');
  });

  it('loads the next page at the end of the list', async () => {
    server.use(
      profileFound(bruno),
      followListPages('bruno', 'following', [
        [followListUserFixture({ displayName: 'Page one' })],
        [followListUserFixture({ displayName: 'Page two' })],
      ]),
    );
    await renderList('/bruno/following');
    await screen.findByRole('article', { name: 'Page one' });

    scrollToEnd();

    expect(await screen.findByRole('article', { name: 'Page two' })).toBeInTheDocument();
    expect(screen.getByText('That’s everyone.')).toBeInTheDocument();
  });

  it('follows someone from their row at once', async () => {
    const carla = followListUserFixture({ username: 'carla', displayName: 'Carla' });
    server.use(
      profileFound(bruno),
      followListPages('bruno', 'followers', [[carla]]),
      http.post('/api/users/carla/follow', () =>
        HttpResponse.json({ isFollowing: true, followersCount: 1 }),
      ),
    );
    const { user } = await renderList('/bruno/followers');
    const row = await screen.findByRole('article', { name: 'Carla' });

    await user.click(within(row).getByRole('button', { name: 'Follow' }));

    expect(within(row).getByRole('button', { name: 'Following' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('rolls back a row whose follow fails', async () => {
    const carla = followListUserFixture({ username: 'carla', displayName: 'Carla' });
    server.use(
      profileFound(bruno),
      followListPages('bruno', 'followers', [[carla]]),
      http.post('/api/users/carla/follow', () => HttpResponse.error()),
    );
    const { user } = await renderList('/bruno/followers');
    const row = await screen.findByRole('article', { name: 'Carla' });

    await user.click(within(row).getByRole('button', { name: 'Follow' }));

    expect(await screen.findByText('The follow didn’t go through. Try again.')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Follow' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('offers no follow button on the viewer’s own row', async () => {
    const me = followListUserFixture({
      id: sessionUser.id,
      username: sessionUser.username,
      displayName: sessionUser.displayName,
    });
    server.use(profileFound(bruno), followListPages('bruno', 'followers', [[me]]));
    await renderList('/bruno/followers');

    const row = await screen.findByRole('article', { name: sessionUser.displayName });
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([
    [
      '/bruno/followers',
      false,
      'No followers yet',
      'When someone follows @bruno, they’ll appear here.',
    ],
    [
      '/bruno/following',
      false,
      'Not following anyone yet',
      'When @bruno follows someone, they’ll appear here.',
    ],
    [
      '/bruno/followers',
      true,
      'No followers yet',
      'When someone follows you, they’ll appear here.',
    ],
    ['/bruno/following', true, 'You don’t follow anyone yet', 'Find people to follow from search.'],
  ])('explains an empty list at %s (own profile: %s)', async (path, isMe, title, description) => {
    server.use(
      profileFound(profileFixture({ isMe })),
      followListPages('bruno', 'followers'),
      followListPages('bruno', 'following'),
    );
    await renderList(path);

    expect(await screen.findByRole('heading', { level: 2, name: title })).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it('offers a retry when the list fails to load', async () => {
    server.use(
      profileFound(bruno),
      http.get('/api/users/bruno/followers', () => HttpResponse.error(), { once: true }),
      followListPages('bruno', 'followers', [[followListUserFixture({ displayName: 'Carla' })]]),
    );
    const { user } = await renderList('/bruno/followers');

    expect(await screen.findByRole('alert')).toHaveTextContent('People didn’t load');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('article', { name: 'Carla' })).toBeInTheDocument();
  });

  it('names the list after the username until the profile arrives', async () => {
    server.use(
      http.get('/api/users/bruno', () => new Promise<Response>(() => {})),
      followListPages('bruno', 'followers'),
    );
    renderRoute('/bruno/followers');

    expect(await screen.findByRole('heading', { level: 1, name: '@bruno' })).toBeInTheDocument();
  });
});
