import type { CreateTweetBody } from '@chirp/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { tweetFixture } from '@/test/fixtures';
import { scrollToEnd } from '@/test/intersection-observer';
import { apiError } from '@/test/msw/errors';
import { timelinePages, tweetCreated } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

import type { TimelineData } from '../hooks';
import { tweetKeys } from '../keys';

const PROMPT = 'What’s happening?';

async function renderHome() {
  const user = userEvent.setup();
  const rendered = renderRoute('/home');
  await screen.findByRole('heading', { level: 1, name: 'Home' });
  return {
    user,
    ...rendered,
    textbox: screen.getByRole('textbox', { name: PROMPT }),
    submit: screen.getByRole('button', { name: 'Chirp' }),
  };
}

describe('Composer', () => {
  it('counts characters as code points, so an emoji is one', async () => {
    const { user, textbox } = await renderHome();
    expect(textbox).toHaveAccessibleDescription('280 characters left');

    await user.type(textbox, 'Hi 🐦');

    expect(textbox).toHaveAccessibleDescription('276 characters left');
  });

  it('can only post when there is something to post within the limit', async () => {
    const { user, textbox, submit } = await renderHome();
    expect(submit).toBeDisabled();

    await user.type(textbox, '   ');
    expect(submit).toBeDisabled();

    await user.type(textbox, 'hello');
    expect(submit).toBeEnabled();

    await user.clear(textbox);
    await user.click(textbox);
    await user.paste('a'.repeat(281));
    expect(submit).toBeDisabled();
    expect(textbox).toHaveAccessibleDescription('1 over the limit');
    expect(textbox).toHaveAttribute('aria-invalid', 'true');

    await user.keyboard('{Backspace}');
    expect(submit).toBeEnabled();
  });

  it('posts the trimmed chirp, clears the field and confirms it', async () => {
    const bodies: CreateTweetBody[] = [];
    server.use(tweetCreated((body) => bodies.push(body)));
    const { user, textbox, submit } = await renderHome();

    await user.type(textbox, '  Hello, Chirp!  ');
    await user.click(submit);

    expect(await screen.findByText('Your chirp is posted')).toBeInTheDocument();
    expect(bodies).toEqual([{ content: 'Hello, Chirp!' }]);
    expect(textbox).toHaveValue('');
    expect(textbox).toHaveAccessibleDescription('280 characters left');
  });

  it('posts with Ctrl+Enter', async () => {
    const bodies: CreateTweetBody[] = [];
    server.use(tweetCreated((body) => bodies.push(body)));
    const { user, textbox } = await renderHome();

    await user.type(textbox, 'Shortcut');
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(await screen.findByText('Your chirp is posted')).toBeInTheDocument();
    expect(bodies).toEqual([{ content: 'Shortcut' }]);
  });

  it('ignores the shortcut while there is nothing to post', async () => {
    const bodies: CreateTweetBody[] = [];
    server.use(tweetCreated((body) => bodies.push(body)));
    const { user, textbox } = await renderHome();

    await user.click(textbox);
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(bodies).toEqual([]);
    expect(textbox).toHaveValue('');
  });

  it('puts the new chirp on top of a loaded timeline, leaving later pages alone', async () => {
    const older = tweetFixture();
    const nextPage = tweetFixture();
    server.use(timelinePages([[older], [nextPage]]), tweetCreated());
    const { user, textbox, submit, queryClient } = await renderHome();
    await screen.findByText(older.content);
    scrollToEnd();
    await screen.findByText(nextPage.content);

    await user.type(textbox, 'Fresh off the press');
    await user.click(submit);
    await screen.findByText('Your chirp is posted');

    const timeline = queryClient.getQueryData<TimelineData>(tweetKeys.timeline);
    expect(timeline?.pages[0]?.items.map((tweet) => tweet.content)).toEqual([
      'Fresh off the press',
      older.content,
    ]);
    expect(timeline?.pages[1]?.items).toEqual([nextPage]);
  });

  it('leaves a timeline that was never loaded alone', async () => {
    server.use(tweetCreated());
    const user = userEvent.setup();
    const { queryClient } = renderRoute('/search');
    await screen.findByRole('heading', { level: 1, name: 'Search' });

    const [composeButton] = screen.getAllByRole('button', { name: 'New chirp' });
    if (!composeButton) throw new Error('expected a compose button');
    await user.click(composeButton);
    const dialog = screen.getByRole('dialog', { name: 'New chirp' });
    await user.type(within(dialog).getByRole('textbox', { name: PROMPT }), 'No timeline yet');
    await user.click(within(dialog).getByRole('button', { name: 'Chirp' }));
    await screen.findByText('Your chirp is posted');

    expect(queryClient.getQueryData(tweetKeys.timeline)).toBeUndefined();
  });

  it('shows the server’s message for the chirp on the field', async () => {
    server.use(
      http.post('/api/tweets', () =>
        apiError(400, 'VALIDATION_ERROR', 'Invalid request', {
          content: ['Use at most 280 characters'],
        }),
      ),
    );
    const { user, textbox, submit } = await renderHome();

    await user.type(textbox, 'Rejected');
    await user.click(submit);

    expect(await screen.findByText('Use at most 280 characters')).toBeInTheDocument();
    expect(textbox).toHaveValue('Rejected');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the draft and explains a connection failure', async () => {
    server.use(http.post('/api/tweets', () => HttpResponse.error()));
    const { user, textbox, submit } = await renderHome();

    await user.type(textbox, 'Offline thought');
    await user.click(submit);

    expect(await screen.findByRole('alert')).toHaveTextContent(/can’t reach chirp/i);
    expect(textbox).toHaveValue('Offline thought');
    expect(submit).toBeEnabled();
  });

  it('posts from the compose modal, which closes before confirming', async () => {
    const bodies: CreateTweetBody[] = [];
    server.use(tweetCreated((body) => bodies.push(body)));
    const { user } = await renderHome();

    const [composeButton] = screen.getAllByRole('button', { name: 'New chirp' });
    if (!composeButton) throw new Error('expected a compose button');
    await user.click(composeButton);
    const dialog = screen.getByRole('dialog', { name: 'New chirp' });
    const textbox = within(dialog).getByRole('textbox', { name: PROMPT });
    expect(textbox).toHaveFocus();

    await user.type(textbox, 'From the modal');
    await user.click(within(dialog).getByRole('button', { name: 'Chirp' }));

    expect(await screen.findByText('Your chirp is posted')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'New chirp' })).not.toBeInTheDocument();
    expect(bodies).toEqual([{ content: 'From the modal' }]);
  });

  it('keeps a draft when the compose modal is closed and reopened', async () => {
    const { user } = await renderHome();
    const [composeButton] = screen.getAllByRole('button', { name: 'New chirp' });
    if (!composeButton) throw new Error('expected a compose button');

    await user.click(composeButton);
    await user.type(
      within(screen.getByRole('dialog')).getByRole('textbox', { name: PROMPT }),
      'Half a thought',
    );
    await user.keyboard('{Escape}');
    await user.click(composeButton);

    expect(within(screen.getByRole('dialog')).getByRole('textbox', { name: PROMPT })).toHaveValue(
      'Half a thought',
    );
  });
});
