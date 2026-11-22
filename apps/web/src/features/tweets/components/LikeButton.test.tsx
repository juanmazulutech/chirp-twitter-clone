import type { LikeState } from '@chirp/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { tweetFixture } from '@/test/fixtures';
import { apiError } from '@/test/msw/errors';
import { timelinePages } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

/** A response the test releases when it is ready, to look at the UI while a request is open. */
function gate() {
  let release: () => void = () => {};
  const opened = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { opened, release };
}

/** `POST`/`DELETE /api/tweets/:id/like` answering `state` once `until` resolves. */
function likeAnswers(state: LikeState, until: Promise<void> = Promise.resolve()) {
  const resolver = async () => {
    await until;
    return HttpResponse.json(state);
  };
  return [
    http.post('/api/tweets/:id/like', resolver),
    http.delete('/api/tweets/:id/like', resolver),
  ];
}

async function renderChirp(overrides: Parameters<typeof tweetFixture>[0]) {
  const tweet = tweetFixture({ content: 'Like me', ...overrides });
  server.use(timelinePages([[tweet]]));
  const user = userEvent.setup();
  const { queryClient } = renderRoute('/home');
  const card = await screen.findByRole('article', { name: /Chirp by/ });
  return {
    user,
    tweet,
    card,
    queryClient,
    button: within(card).getByRole('button', { name: 'Like' }),
  };
}

describe('LikeButton', () => {
  it('likes at once, before the server answers, and keeps the server’s count', async () => {
    const response = gate();
    server.use(...likeAnswers({ liked: true, likeCount: 5 }, response.opened));
    const { user, card, button } = await renderChirp({ likeCount: 3, likedByMe: false });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(within(card).getByText('4 likes')).toBeInTheDocument();

    response.release();

    // Someone else liked it meanwhile: the server's count wins over the guess.
    expect(await within(card).findByText('5 likes')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('unlikes a liked chirp', async () => {
    const requests: string[] = [];
    server.use(
      http.delete('/api/tweets/:id/like', ({ request }) => {
        requests.push(new URL(request.url).pathname);
        return HttpResponse.json({ liked: false, likeCount: 0 });
      }),
    );
    const { user, tweet, card, button } = await renderChirp({ likeCount: 1, likedByMe: true });

    await user.click(button);

    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(within(card).getByText('0 likes')).toBeInTheDocument();
    expect(requests).toEqual([`/api/tweets/${tweet.id}/like`]);
  });

  it('rolls back and says so when the like fails', async () => {
    server.use(http.post('/api/tweets/:id/like', () => HttpResponse.error()));
    const { user, card, button } = await renderChirp({ likeCount: 2, likedByMe: false });

    await user.click(button);

    expect(await screen.findByText('The like didn’t go through. Try again.')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(within(card).getByText('2 likes')).toBeInTheDocument();
  });

  it('rolls back a failed unlike', async () => {
    server.use(
      http.delete('/api/tweets/:id/like', () => apiError(500, 'INTERNAL_ERROR', 'Something broke')),
    );
    const { user, card, button } = await renderChirp({ likeCount: 1, likedByMe: true });

    await user.click(button);

    expect(await screen.findByText('The like wasn’t removed. Try again.')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(within(card).getByText('1 like')).toBeInTheDocument();
  });

  it('keeps the last of quick toggles, whatever order the answers arrive in', async () => {
    const firstAnswer = gate();
    server.use(
      http.post('/api/tweets/:id/like', async () => {
        await firstAnswer.opened;
        return HttpResponse.json({ liked: true, likeCount: 1 });
      }),
      http.delete('/api/tweets/:id/like', () => HttpResponse.json({ liked: false, likeCount: 0 })),
    );
    const { user, card, button, queryClient } = await renderChirp({
      likeCount: 0,
      likedByMe: false,
    });

    await user.click(button);
    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');

    // The like's answer lands after the unlike's: it must not resurrect the like.
    firstAnswer.release();
    await waitFor(() => {
      expect(queryClient.isMutating()).toBe(0);
    });

    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(within(card).getByText('0 likes')).toBeInTheDocument();
  });
});
