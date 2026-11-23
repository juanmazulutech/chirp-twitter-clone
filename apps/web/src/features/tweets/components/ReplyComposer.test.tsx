import type { CreateReplyBody, Tweet } from '@chirp/shared';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { brunoSummary, replyFixture, tweetFixture } from '@/test/fixtures';
import { apiError } from '@/test/msw/errors';
import { threadOf, timelinePages } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

import { useComposerStore } from '../store';

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

async function renderTimeline(chirps: Tweet[]) {
  server.use(timelinePages([chirps]));
  const user = userEvent.setup();
  const rendered = renderRoute('/home');
  const list = await screen.findByRole('list', { name: 'Home timeline' });
  return { user, list, ...rendered };
}

describe('replying', () => {
  it('shows each chirp’s reply count beside a Reply button', async () => {
    const { list } = await renderTimeline([
      tweetFixture({ replyCount: 0 }),
      tweetFixture({ replyCount: 1 }),
      tweetFixture({ replyCount: 1234 }),
    ]);

    const rows = within(list).getAllByRole('article');
    expect(rows.map((row) => within(row).getByRole('button', { name: 'Reply' }))).toHaveLength(3);
    expect(within(list).getByText('0 replies')).toBeInTheDocument();
    expect(within(list).getByText('1 reply')).toBeInTheDocument();
    expect(within(list).getByText('1,234 replies')).toBeInTheDocument();
  });

  it('answers a chirp from the timeline in the compose modal and counts the reply', async () => {
    const parent = tweetFixture({ author: brunoSummary, content: 'What should I read?' });
    const sent = replyCreated(parent);
    const { user, list } = await renderTimeline([parent]);

    await user.click(within(list).getByRole('button', { name: 'Reply' }));
    const dialog = screen.getByRole('dialog', { name: 'Reply' });
    // The chirp being answered stays in view, taken from the timeline without a request.
    expect(within(dialog).getByText('What should I read?')).toBeInTheDocument();
    const field = within(dialog).getByRole('textbox', { name: 'Reply to @bruno' });
    expect(field).toHaveFocus();

    await user.type(field, '  Start with the classics  ');
    await user.click(within(dialog).getByRole('button', { name: 'Reply' }));

    expect(await screen.findByText('Your reply is posted')).toBeInTheDocument();
    expect(sent).toEqual([{ content: 'Start with the classics' }]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(list).getByText('1 reply')).toBeInTheDocument();
    // The timeline lists top-level chirps only.
    expect(within(list).queryByText('Start with the classics')).not.toBeInTheDocument();
  });

  it('keeps a new chirp’s draft while a reply is written', async () => {
    const parent = tweetFixture({ author: brunoSummary });
    const { user, list } = await renderTimeline([parent]);

    await user.click(screen.getAllByRole('button', { name: 'New chirp' })[0] as HTMLElement);
    const dialog = screen.getByRole('dialog', { name: 'New chirp' });
    await user.type(within(dialog).getByRole('textbox', { name: 'What’s happening?' }), 'Draft');
    await user.keyboard('{Escape}');
    await user.click(within(list).getByRole('button', { name: 'Reply' }));
    await user.keyboard('{Escape}');
    await user.click(screen.getAllByRole('button', { name: 'New chirp' })[0] as HTMLElement);

    expect(
      within(screen.getByRole('dialog', { name: 'New chirp' })).getByRole('textbox', {
        name: 'What’s happening?',
      }),
    ).toHaveValue('Draft');
  });

  it('says what went wrong when the chirp was deleted meanwhile, and keeps the draft', async () => {
    const parent = tweetFixture({ author: brunoSummary });
    server.use(
      http.post(`/api/tweets/${parent.id}/replies`, () =>
        apiError(404, 'NOT_FOUND', 'Tweet not found'),
      ),
    );
    const { user, list } = await renderTimeline([parent]);

    await user.click(within(list).getByRole('button', { name: 'Reply' }));
    const dialog = screen.getByRole('dialog', { name: 'Reply' });
    await user.type(within(dialog).getByRole('textbox'), 'Too late');
    await user.click(within(dialog).getByRole('button', { name: 'Reply' }));

    expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox')).toHaveValue('Too late');
    expect(within(list).getByText('0 replies')).toBeInTheDocument();
  });

  it('keeps Reply disabled until the text fits the limit', async () => {
    const { user, list } = await renderTimeline([tweetFixture({ author: brunoSummary })]);

    await user.click(within(list).getByRole('button', { name: 'Reply' }));
    const dialog = screen.getByRole('dialog', { name: 'Reply' });
    const submit = within(dialog).getByRole('button', { name: 'Reply' });
    expect(submit).toBeDisabled();

    await user.click(within(dialog).getByRole('textbox'));
    await user.paste('a'.repeat(281));

    expect(within(dialog).getByText('1 over the limit')).toBeInTheDocument();
    expect(submit).toBeDisabled();
  });

  it('fetches the chirp to answer when no list on screen has it', async () => {
    const parent = tweetFixture({ author: brunoSummary, content: 'Fetched for the modal' });
    server.use(...threadOf(parent));
    renderRoute('/home');
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    // A reply button elsewhere (a notification, later) may name a chirp nobody has loaded.
    act(() => {
      useComposerStore.getState().openReply(parent.id);
    });

    const dialog = await screen.findByRole('dialog', { name: 'Reply' });
    expect(await within(dialog).findByText('Fetched for the modal')).toBeInTheDocument();
  });

  it('replies inline on a chirp’s page and adds the reply to its thread', async () => {
    const parent = tweetFixture({ author: brunoSummary, content: 'Thread starter', replyCount: 1 });
    const earlier = replyFixture(parent, { content: 'Earlier reply' });
    server.use(...threadOf(parent, { replies: [[earlier]] }));
    replyCreated(parent);
    const user = userEvent.setup();
    renderRoute(`/bruno/status/${parent.id}`);

    const replies = await screen.findByRole('list', { name: 'Replies to Bruno Silva' });
    const field = screen.getByRole('textbox', { name: 'Reply to @bruno' });
    await user.type(field, 'Inline answer');
    const form = field.closest('form');
    if (!form) throw new Error('the reply box has no form');
    await user.click(within(form).getByRole('button', { name: 'Reply' }));

    await waitFor(() => {
      expect(
        within(replies)
          .getAllByRole('article')
          .map((row) => row.textContent),
      ).toEqual([
        expect.stringContaining('Earlier reply'),
        expect.stringContaining('Inline answer'),
      ]);
    });
    const focused = screen.getAllByRole('article', { name: 'Chirp by Bruno Silva' })[0];
    expect(within(focused as HTMLElement).getByText('2 replies')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Reply to @bruno' })).toHaveValue('');
  });

  it('lowers the parent’s count when one of its replies is deleted', async () => {
    const parent = tweetFixture({ author: brunoSummary, replyCount: 1 });
    const mine = replyFixture(parent, { content: 'My reply' });
    let deleted = false;
    server.use(
      http.delete(`/api/tweets/${mine.id}`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
      // Open conversations are refetched after a delete; the server counts honestly.
      http.get(`/api/tweets/${parent.id}`, () =>
        HttpResponse.json({ ...parent, replyCount: deleted ? 0 : 1 }),
      ),
      ...threadOf(parent, { replies: [[mine]] }),
    );
    const user = userEvent.setup();
    renderRoute(`/bruno/status/${parent.id}`);

    const replies = await screen.findByRole('list', { name: 'Replies to Bruno Silva' });
    await user.click(within(replies).getByRole('button', { name: 'Delete chirp' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Your chirp was deleted')).toBeInTheDocument();
    expect(within(replies).queryByText('My reply')).not.toBeInTheDocument();
    expect(screen.getByText('0 replies')).toBeInTheDocument();
  });
});
