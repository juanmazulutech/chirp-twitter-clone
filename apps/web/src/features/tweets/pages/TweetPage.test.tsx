import { THREAD_ANCESTORS_MAX } from '@chirp/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { brunoSummary, replyFixture, tweetFixture } from '@/test/fixtures';
import { scrollToEnd } from '@/test/intersection-observer';
import { apiError } from '@/test/msw/errors';
import { threadOf, timelinePages, tweetFound } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

const pathOf = (tweet: { id: string; author: { username: string } }) =>
  `/${tweet.author.username}/status/${tweet.id}`;

async function renderThread(path: string) {
  const user = userEvent.setup();
  const rendered = renderRoute(path);
  await screen.findByRole('heading', { level: 1 });
  return { user, ...rendered };
}

describe('TweetPage', () => {
  it('shows the conversation above, the chirp, then its replies in order', async () => {
    const root = tweetFixture({ author: brunoSummary, content: 'Root chirp' });
    const middle = replyFixture(root, { content: 'Middle reply' });
    const focused = replyFixture(middle, { author: brunoSummary, content: 'Focused reply' });
    const first = replyFixture(focused, { content: 'First answer' });
    const second = replyFixture(focused, { content: 'Second answer' });
    server.use(...threadOf(focused, { ancestors: [root, middle], replies: [[first, second]] }));

    await renderThread(pathOf(focused));

    const earlier = await screen.findByRole('list', { name: 'Earlier in this conversation' });
    expect(
      within(earlier)
        .getAllByRole('article')
        .map((article) => article.textContent),
    ).toEqual([expect.stringContaining('Root chirp'), expect.stringContaining('Middle reply')]);
    const replies = await screen.findByRole('list', { name: 'Replies to Bruno Silva' });
    expect(
      within(replies)
        .getAllByRole('article')
        .map((article) => article.textContent),
    ).toEqual([expect.stringContaining('First answer'), expect.stringContaining('Second answer')]);
    expect(screen.getByText('Focused reply')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Conversation' })).toBeInTheDocument();
  });

  it('spells out when the chirp was sent and who it answers', async () => {
    const parent = tweetFixture({ author: brunoSummary });
    const focused = replyFixture(parent, { createdAt: '2026-11-21T10:00:00.000Z' });
    server.use(...threadOf(focused, { ancestors: [parent] }));

    await renderThread(pathOf(focused));

    const chirps = await screen.findAllByRole('article', { name: 'Chirp by Ana Torres' });
    const article = chirps.at(-1);
    if (!article) throw new Error('no focused chirp');
    expect(within(article).getByText('Replying to')).toBeInTheDocument();
    expect(within(article).getByRole('link', { name: '@bruno' })).toHaveAttribute('href', '/bruno');
    expect(within(article).getAllByText(/November 21, 2026/).length).toBeGreaterThan(0);
  });

  it('shows no conversation above a top-level chirp', async () => {
    const focused = tweetFixture({ content: 'Just me' });
    server.use(...threadOf(focused));

    await renderThread(pathOf(focused));

    await screen.findByText('Just me');
    expect(screen.queryByRole('list', { name: 'Earlier in this conversation' })).toBeNull();
    expect(await screen.findByRole('heading', { name: 'No replies yet' })).toBeInTheDocument();
  });

  it('links to earlier chirps when the conversation goes further up', async () => {
    const ancestors = Array.from({ length: THREAD_ANCESTORS_MAX }, (_, index) =>
      tweetFixture({ content: `Level ${index}` }),
    );
    const above = tweetFixture({ author: brunoSummary });
    const [topmost] = ancestors;
    if (!topmost) throw new Error('no ancestors');
    ancestors[0] = { ...topmost, replyTo: { id: above.id, author: above.author } };
    const focused = replyFixture(ancestors.at(-1) ?? topmost);
    server.use(...threadOf(focused, { ancestors }));

    await renderThread(pathOf(focused));

    expect(await screen.findByRole('link', { name: 'Show earlier chirps' })).toHaveAttribute(
      'href',
      pathOf(above),
    );
  });

  it('loads more replies as the reader reaches the end', async () => {
    const focused = tweetFixture();
    const pages = [
      [replyFixture(focused, { content: 'Page one' })],
      [replyFixture(focused, { content: 'Page two' })],
    ];
    server.use(...threadOf(focused, { replies: pages }));

    await renderThread(pathOf(focused));
    await screen.findByText('Page one');
    scrollToEnd();

    expect(await screen.findByText('Page two')).toBeInTheDocument();
  });

  it('corrects an address that names the wrong author', async () => {
    const focused = tweetFixture({ author: brunoSummary, content: 'By Bruno' });
    server.use(...threadOf(focused));

    const { router } = await renderThread(`/someone_else/status/${focused.id}`);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(pathOf(focused));
    });
    expect(await screen.findByText('By Bruno')).toBeInTheDocument();
  });

  it('says so when the chirp does not exist', async () => {
    const missing = tweetFixture();
    server.use(
      http.get(`/api/tweets/${missing.id}`, () => apiError(404, 'NOT_FOUND', 'Tweet not found')),
      ...threadOf(missing),
    );

    await renderThread(pathOf(missing));

    expect(
      await screen.findByRole('heading', { name: 'This chirp doesn’t exist' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/home');
  });

  it('offers to try again when the chirp fails to load', async () => {
    const focused = tweetFixture({ content: 'Second time lucky' });
    server.use(
      http.get(`/api/tweets/${focused.id}`, () => HttpResponse.error(), { once: true }),
      ...threadOf(focused),
    );
    const { user } = await renderThread(pathOf(focused));

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Second time lucky')).toBeInTheDocument();
  });

  it('offers to try again when the conversation above fails to load', async () => {
    const parent = tweetFixture({ author: brunoSummary, content: 'The parent' });
    const focused = replyFixture(parent);
    server.use(
      http.get(`/api/tweets/${focused.id}/ancestors`, () => HttpResponse.error(), { once: true }),
      ...threadOf(focused, { ancestors: [parent] }),
    );
    const { user } = await renderThread(pathOf(focused));

    expect(
      await screen.findByRole('heading', { name: 'The rest of the conversation didn’t load' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('The parent')).toBeInTheDocument();
  });

  it('likes the focused chirp at once', async () => {
    const focused = tweetFixture({ likeCount: 2 });
    server.use(
      http.post(`/api/tweets/${focused.id}/like`, () =>
        HttpResponse.json({ liked: true, likeCount: 3 }),
      ),
      ...threadOf(focused),
    );
    const { user } = await renderThread(pathOf(focused));

    await user.click(await screen.findByRole('button', { name: 'Like' }));

    expect(screen.getByRole('button', { name: 'Like' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('3 likes')).toBeInTheDocument();
  });

  it('opens from a chirp’s postmark in the timeline', async () => {
    const chirp = tweetFixture({ author: brunoSummary, content: 'Open me' });
    server.use(timelinePages([[chirp]]), ...threadOf(chirp));
    const { user, router } = await renderThread('/home');

    const row = await screen.findByRole('article', { name: 'Chirp by Bruno Silva' });
    await user.click(within(row).getByRole('link', { name: /open chirp/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(pathOf(chirp));
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Conversation' }),
    ).toBeInTheDocument();
  });

  it('forgets the chirp and its replies once it is deleted', async () => {
    const focused = tweetFixture({ content: 'Mine to delete' });
    let deleted = false;
    server.use(
      http.get(`/api/tweets/${focused.id}`, () =>
        deleted ? apiError(404, 'NOT_FOUND', 'Tweet not found') : HttpResponse.json(focused),
      ),
      http.delete(`/api/tweets/${focused.id}`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
      ...threadOf(focused),
    );
    const { user } = await renderThread(pathOf(focused));

    await user.click(await screen.findByRole('button', { name: 'Delete chirp' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      await screen.findByRole('heading', { name: 'This chirp doesn’t exist' }),
    ).toBeInTheDocument();
  });

  it('keeps a reply’s like in step with its copy in the thread above', async () => {
    const parent = tweetFixture({ author: brunoSummary, content: 'Liked above' });
    const focused = replyFixture(parent);
    server.use(
      tweetFound(focused),
      http.post(`/api/tweets/${parent.id}/like`, () =>
        HttpResponse.json({ liked: true, likeCount: 1 }),
      ),
      ...threadOf(focused, { ancestors: [parent] }),
    );
    const { user } = await renderThread(pathOf(focused));

    const above = await screen.findByRole('article', { name: 'Chirp by Bruno Silva' });
    await user.click(within(above).getByRole('button', { name: 'Like' }));

    expect(within(above).getByRole('button', { name: 'Like' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
