import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { brunoSummary, followListUserFixture, tweetFixture } from '@/test/fixtures';
import { scrollToEnd } from '@/test/intersection-observer';
import { apiError } from '@/test/msw/errors';
import { likersPages, threadOf } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

const chirp = tweetFixture({ author: brunoSummary, content: 'Fresh bread', likeCount: 2 });
const chirpPath = `/bruno/status/${chirp.id}`;
const likersPath = `${chirpPath}/likes`;

async function renderLikers(path = likersPath) {
  const user = userEvent.setup();
  const rendered = renderRoute(path);
  await screen.findByRole('heading', { level: 1, name: 'Liked by' });
  return { user, ...rendered };
}

describe('LikersPage', () => {
  it('opens from the like count on the chirp’s page', async () => {
    const carla = followListUserFixture({ username: 'carla', displayName: 'Carla' });
    server.use(...threadOf(chirp), likersPages(chirp.id, [[carla]]));
    const user = userEvent.setup();
    const { router } = renderRoute(chirpPath);

    await user.click(await screen.findByRole('link', { name: '2 likes' }));

    const list = await screen.findByRole('list', { name: 'People who liked this chirp' });
    expect(within(list).getByRole('article', { name: 'Carla' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(likersPath);
  });

  it('keeps the like count as text when nobody liked the chirp yet', async () => {
    server.use(...threadOf({ ...chirp, likeCount: 0 }));
    renderRoute(chirpPath);

    expect(await screen.findByText('0 likes')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '0 likes' })).not.toBeInTheDocument();
  });

  it('lists everyone who liked it, a page at a time', async () => {
    server.use(
      likersPages(chirp.id, [
        [followListUserFixture({ displayName: 'Page one' })],
        [followListUserFixture({ displayName: 'Page two' })],
      ]),
    );
    await renderLikers();
    await screen.findByRole('article', { name: 'Page one' });

    scrollToEnd();

    expect(await screen.findByRole('article', { name: 'Page two' })).toBeInTheDocument();
    expect(screen.getByText('That’s everyone.')).toBeInTheDocument();
  });

  it('follows someone from their row at once', async () => {
    const carla = followListUserFixture({ username: 'carla', displayName: 'Carla' });
    server.use(
      likersPages(chirp.id, [[carla]]),
      http.post('/api/users/carla/follow', () =>
        HttpResponse.json({ isFollowing: true, followersCount: 1 }),
      ),
    );
    const { user } = await renderLikers();
    const row = await screen.findByRole('article', { name: 'Carla' });

    await user.click(within(row).getByRole('button', { name: 'Follow' }));

    expect(within(row).getByRole('button', { name: 'Following' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('says so when nobody has liked it', async () => {
    server.use(likersPages(chirp.id, [[]]));
    await renderLikers();

    expect(await screen.findByRole('heading', { name: 'No likes yet' })).toBeInTheDocument();
  });

  it('explains a chirp that does not exist', async () => {
    server.use(
      http.get(`/api/tweets/${chirp.id}/likes`, () =>
        apiError(404, 'NOT_FOUND', 'Tweet not found'),
      ),
    );
    await renderLikers();

    expect(
      await screen.findByRole('heading', { name: 'This chirp doesn’t exist' }),
    ).toBeInTheDocument();
  });

  it('goes back to the chirp on a direct visit', async () => {
    server.use(likersPages(chirp.id, [[]]), ...threadOf(chirp));
    const { user, router } = await renderLikers();

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(router.state.location.pathname).toBe(chirpPath);
  });

  it('goes back where the reader came from after navigating in the app', async () => {
    server.use(...threadOf(chirp), likersPages(chirp.id, [[]]));
    const user = userEvent.setup();
    const { router } = renderRoute(chirpPath);
    await user.click(await screen.findByRole('link', { name: '2 likes' }));
    await screen.findByRole('heading', { level: 1, name: 'Liked by' });

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(router.state.location.pathname).toBe(chirpPath);
  });
});
