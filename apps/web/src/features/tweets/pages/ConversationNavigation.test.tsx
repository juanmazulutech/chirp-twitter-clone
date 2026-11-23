import type { Tweet } from '@chirp/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { brunoSummary, profileFixture, replyFixture, tweetFixture } from '@/test/fixtures';
import { apiError } from '@/test/msw/errors';
import { profileFound, threadOf, timelinePages, userTweetsPages } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

const pathOf = (tweet: Pick<Tweet, 'id' | 'author'>) =>
  `/${tweet.author.username}/status/${tweet.id}`;

async function renderTimeline(chirps: Tweet[]) {
  server.use(timelinePages([chirps]));
  const user = userEvent.setup();
  const rendered = renderRoute('/home');
  const list = await screen.findByRole('list', { name: 'Home timeline' });
  return { user, list, ...rendered };
}

describe('moving around conversations', () => {
  it('opens a chirp’s conversation from a click anywhere on its row', async () => {
    const chirp = tweetFixture({ author: brunoSummary, content: 'Click my text' });
    server.use(...threadOf(chirp));
    const { user, list, router } = await renderTimeline([chirp]);

    await user.click(within(list).getByText('Click my text'));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(pathOf(chirp));
    });
  });

  it('leaves the row’s own controls to do their job', async () => {
    const chirp = tweetFixture({ author: brunoSummary });
    server.use(
      http.post(`/api/tweets/${chirp.id}/like`, () =>
        HttpResponse.json({ liked: true, likeCount: 1 }),
      ),
      profileFound(profileFixture()),
      userTweetsPages('bruno'),
    );
    const { user, list, router } = await renderTimeline([chirp]);

    await user.click(within(list).getByRole('button', { name: 'Like' }));
    await user.click(within(list).getByRole('link', { name: 'Bruno Silva' }));

    // The like stayed on the timeline; the name went to the profile, not the conversation.
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/bruno');
    });
  });

  it('keeps the author on the page while they confirm a delete', async () => {
    const mine = tweetFixture({ content: 'Mine' });
    const { user, list, router } = await renderTimeline([mine]);

    await user.click(within(list).getByRole('button', { name: 'Delete chirp' }));
    // The dialog lives inside the row in the DOM; clicks in it must not open the chirp.
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(router.state.location.pathname).toBe('/home');
  });

  it('does not open the chirp when the reader was selecting its text', async () => {
    const chirp = tweetFixture({ author: brunoSummary, content: 'Copy this line' });
    const { list, router } = await renderTimeline([chirp]);
    const text = within(list).getByText('Copy this line');

    // The click that ends a drag-select lands on the row with the text still selected.
    const selection = window.getSelection();
    selection?.selectAllChildren(text);
    fireEvent.click(text);
    selection?.removeAllRanges();

    expect(router.state.location.pathname).toBe('/home');
  });

  it('goes up to the parent’s conversation from a chirp above', async () => {
    const parent = tweetFixture({ author: brunoSummary, content: 'The parent' });
    const reply = replyFixture(parent, { content: 'The reply' });
    server.use(...threadOf(reply, { ancestors: [parent] }), ...threadOf(parent));
    const user = userEvent.setup();
    const { router } = renderRoute(pathOf(reply));

    const above = await screen.findByRole('list', { name: 'Earlier in this conversation' });
    await user.click(within(above).getByText('The parent'));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(pathOf(parent));
    });
  });

  it('goes back where the reader came from', async () => {
    const chirp = tweetFixture({ author: brunoSummary, content: 'Round trip' });
    server.use(...threadOf(chirp));
    const { user, list, router } = await renderTimeline([chirp]);

    await user.click(within(list).getByText('Round trip'));
    await screen.findByRole('heading', { level: 1, name: 'Conversation' });
    await user.click(screen.getByRole('button', { name: 'Back' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/home');
    });
  });

  it('goes up to the chirp a reply answers when visited directly', async () => {
    const parent = tweetFixture({ author: brunoSummary });
    const reply = replyFixture(parent);
    server.use(...threadOf(reply, { ancestors: [parent] }), ...threadOf(parent));
    const user = userEvent.setup();
    const { router } = renderRoute(pathOf(reply));

    await user.click(await screen.findByRole('button', { name: 'Back' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(pathOf(parent));
    });
  });

  it('goes home from a top-level chirp visited directly', async () => {
    const chirp = tweetFixture({ author: brunoSummary });
    server.use(...threadOf(chirp));
    const user = userEvent.setup();
    const { router } = renderRoute(pathOf(chirp));
    await screen.findByRole('article', { name: 'Chirp by Bruno Silva' });

    await user.click(screen.getByRole('button', { name: 'Back' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/home');
    });
  });

  it('offers a way out of a chirp that does not exist', async () => {
    const missing = tweetFixture();
    server.use(
      http.get(`/api/tweets/${missing.id}`, () => apiError(404, 'NOT_FOUND', 'Tweet not found')),
      ...threadOf(missing),
    );
    const user = userEvent.setup();
    const { router } = renderRoute(pathOf(missing));
    await screen.findByRole('heading', { name: 'This chirp doesn’t exist' });

    await user.click(screen.getByRole('button', { name: 'Back' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/home');
    });
  });
});
