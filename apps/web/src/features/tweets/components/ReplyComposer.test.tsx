import type { CreateReplyBody, Tweet } from '@chirp/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { brunoSummary, replyFixture, tweetFixture } from '@/test/fixtures';
import { apiError } from '@/test/msw/errors';
import { threadOf, timelinePages } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

const pathOf = (tweet: Pick<Tweet, 'id' | 'author'>) =>
  `/${tweet.author.username}/status/${tweet.id}`;

/** `POST /api/tweets/:id/replies` storing the reply as the API would; `sent` collects bodies. */
function replyCreated(parent: Tweet) {
  const sent: CreateReplyBody[] = [];
  server.use(
    http.post(`/api/tweets/${parent.id}/replies`, async ({ request }) => {
      const body = (await request.json()) as CreateReplyBody;
      sent.push(body);
      return HttpResponse.json(replyFixture(parent, { content: body.content }), { status: 201 });
    }),
  );
  return sent;
}

/** The reply box's form, for its own Reply button (the page has other Reply controls). */
function replyFormOf(field: HTMLElement): HTMLElement {
  const form = field.closest('form');
  if (!form) throw new Error('the reply box has no form');
  return form;
}

async function renderTimeline(chirps: Tweet[]) {
  server.use(timelinePages([chirps]));
  const user = userEvent.setup();
  const rendered = renderRoute('/home');
  const list = await screen.findByRole('list', { name: 'Home timeline' });
  return { user, list, ...rendered };
}

/** A conversation page; `overrides` win over the thread's default handlers. */
async function renderConversation(
  parent: Tweet,
  replies: Tweet[] = [],
  overrides: Parameters<typeof server.use> = [],
) {
  server.use(...overrides, ...threadOf(parent, { replies: [replies] }));
  const user = userEvent.setup();
  const rendered = renderRoute(pathOf(parent));
  const field = await screen.findByRole('textbox', {
    name: `Reply to @${parent.author.username}`,
  });
  const submit = within(replyFormOf(field)).getByRole('button', { name: 'Reply' });
  return { user, field, submit, ...rendered };
}

describe('replying', () => {
  it('shows each chirp’s reply count as a link to its conversation', async () => {
    const first = tweetFixture({ replyCount: 0 });
    const { list } = await renderTimeline([
      first,
      tweetFixture({ replyCount: 1 }),
      tweetFixture({ replyCount: 1234 }),
    ]);

    expect(within(list).getByRole('link', { name: 'Reply, 0 replies' })).toHaveAttribute(
      'href',
      pathOf(first),
    );
    expect(within(list).getByRole('link', { name: 'Reply, 1 reply' })).toBeInTheDocument();
    expect(within(list).getByRole('link', { name: 'Reply, 1,234 replies' })).toBeInTheDocument();
  });

  it('opens the conversation from the timeline, ready to type, and adds the reply', async () => {
    const parent = tweetFixture({ author: brunoSummary, replyCount: 1 });
    const earlier = replyFixture(parent, { content: 'Earlier answer' });
    server.use(...threadOf(parent, { replies: [[earlier]] }));
    const sent = replyCreated(parent);
    const { user, list, router } = await renderTimeline([parent]);

    await user.click(within(list).getByRole('link', { name: 'Reply, 1 reply' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(pathOf(parent));
    });
    // The thread is in view, and the cursor waits in the reply box.
    const replies = await screen.findByRole('list', { name: 'Replies to Bruno Silva' });
    expect(await within(replies).findByText('Earlier answer')).toBeInTheDocument();
    const field = screen.getByRole('textbox', { name: 'Reply to @bruno' });
    await waitFor(() => {
      expect(field).toHaveFocus();
    });

    await user.type(field, '  Start with the classics  ');
    await user.click(within(replyFormOf(field)).getByRole('button', { name: 'Reply' }));

    expect(await screen.findByText('Your reply is posted')).toBeInTheDocument();
    expect(sent).toEqual([{ content: 'Start with the classics' }]);
    await waitFor(() => {
      expect(
        within(replies)
          .getAllByRole('article')
          .map((row) => row.textContent),
      ).toEqual([
        expect.stringContaining('Earlier answer'),
        expect.stringContaining('Start with the classics'),
      ]);
    });
    expect(field).toHaveValue('');
    const focused = screen.getByRole('article', { name: 'Chirp by Bruno Silva' });
    expect(within(focused).getByText('2 replies')).toBeInTheDocument();
  });

  it('counts the reply on the timeline once the reader goes back', async () => {
    const parent = tweetFixture({ author: brunoSummary, content: 'Ask me anything' });
    server.use(...threadOf(parent));
    replyCreated(parent);
    const { user, list, router } = await renderTimeline([parent]);

    await user.click(within(list).getByRole('link', { name: 'Reply, 0 replies' }));
    const field = await screen.findByRole('textbox', { name: 'Reply to @bruno' });
    await user.type(field, 'Why chirps?');
    await user.click(within(replyFormOf(field)).getByRole('button', { name: 'Reply' }));
    await screen.findByText('Your reply is posted');
    await router.navigate(-1);

    const timeline = await screen.findByRole('list', { name: 'Home timeline' });
    expect(within(timeline).getByRole('link', { name: 'Reply, 1 reply' })).toBeInTheDocument();
    // The timeline lists top-level chirps only.
    expect(within(timeline).queryByText('Why chirps?')).not.toBeInTheDocument();
  });

  it('does not take focus when the conversation opens from the postmark', async () => {
    const parent = tweetFixture({ author: brunoSummary });
    server.use(...threadOf(parent));
    const { user, list } = await renderTimeline([parent]);

    await user.click(within(list).getByRole('link', { name: /open chirp/i }));

    const field = await screen.findByRole('textbox', { name: 'Reply to @bruno' });
    expect(field).not.toHaveFocus();
  });

  it('moves to the reply box from the conversation’s own Reply button', async () => {
    const parent = tweetFixture({ author: brunoSummary });
    const { user, field } = await renderConversation(parent);
    expect(field).not.toHaveFocus();

    const focused = screen.getByRole('article', { name: 'Chirp by Bruno Silva' });
    await user.click(within(focused).getByRole('button', { name: 'Reply' }));

    expect(field).toHaveFocus();
  });

  it('opens a reply’s own conversation from its reply action', async () => {
    const parent = tweetFixture({ author: brunoSummary });
    const reply = replyFixture(parent, { content: 'Answer me back' });
    const { user, router } = await renderConversation(parent, [reply]);
    server.use(...threadOf(reply, { ancestors: [parent] }));

    const replies = screen.getByRole('list', { name: 'Replies to Bruno Silva' });
    await user.click(await within(replies).findByRole('link', { name: 'Reply, 0 replies' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(pathOf(reply));
    });
    expect(await screen.findByRole('textbox', { name: 'Reply to @ana_codes' })).toBeInTheDocument();
  });

  it('says what went wrong when the chirp was deleted meanwhile, and keeps the draft', async () => {
    const parent = tweetFixture({ author: brunoSummary });
    server.use(
      http.post(`/api/tweets/${parent.id}/replies`, () =>
        apiError(404, 'NOT_FOUND', 'Tweet not found'),
      ),
    );
    const { user, field, submit } = await renderConversation(parent);

    await user.type(field, 'Too late');
    await user.click(submit);

    expect(await within(replyFormOf(field)).findByRole('alert')).toBeInTheDocument();
    expect(field).toHaveValue('Too late');
  });

  it('keeps Reply disabled until the text fits the limit', async () => {
    const { user, field, submit } = await renderConversation(
      tweetFixture({ author: brunoSummary }),
    );
    expect(submit).toBeDisabled();

    await user.click(field);
    await user.paste('a'.repeat(281));

    expect(screen.getByText('1 over the limit')).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });

  it('lowers the parent’s count when one of its replies is deleted', async () => {
    const parent = tweetFixture({ author: brunoSummary, replyCount: 1 });
    const mine = replyFixture(parent, { content: 'My reply' });
    let deleted = false;
    const overrides = [
      http.delete(`/api/tweets/${mine.id}`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
      // Open conversations are refetched after a delete; the server counts honestly.
      http.get(`/api/tweets/${parent.id}`, () =>
        HttpResponse.json({ ...parent, replyCount: deleted ? 0 : 1 }),
      ),
    ];
    const { user } = await renderConversation(parent, [mine], overrides);

    const replies = await screen.findByRole('list', { name: 'Replies to Bruno Silva' });
    await user.click(await within(replies).findByRole('button', { name: 'Delete chirp' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Your chirp was deleted')).toBeInTheDocument();
    expect(within(replies).queryByText('My reply')).not.toBeInTheDocument();
    const focused = screen.getByRole('article', { name: 'Chirp by Bruno Silva' });
    await waitFor(() => {
      expect(within(focused).getByText('0 replies')).toBeInTheDocument();
    });
  });
});
