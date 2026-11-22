import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { tweetFixture } from '@/test/fixtures';
import { apiError } from '@/test/msw/errors';
import { timelinePages } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

/** `DELETE /api/tweets/:id` answering with `respond`; `deleted` collects the ids asked for. */
function deleteAnswers(respond: () => Response = () => new HttpResponse(null, { status: 204 })) {
  const deleted: string[] = [];
  server.use(
    http.delete('/api/tweets/:id', ({ params }) => {
      deleted.push(String(params.id));
      return respond();
    }),
  );
  return deleted;
}

async function renderOwnChirp() {
  const mine = tweetFixture({ content: 'Mine to delete' });
  const other = tweetFixture({ content: 'Stays put' });
  server.use(timelinePages([[mine, other]]));
  const user = userEvent.setup();
  renderRoute('/home');
  const list = await screen.findByRole('list', { name: 'Home timeline' });
  const card = within(list).getAllByRole('article')[0];
  if (!card) throw new Error('The timeline rendered no chirps');
  const openButton = await within(card).findByRole('button', { name: 'Delete chirp' });
  return { user, mine, list, openButton };
}

describe('DeleteTweetButton', () => {
  it('asks first, then removes the chirp from the timeline and confirms', async () => {
    const deleted = deleteAnswers();
    const { user, mine, list, openButton } = await renderOwnChirp();

    await user.click(openButton);
    const dialog = screen.getByRole('dialog', { name: 'Delete chirp?' });
    expect(deleted).toEqual([]);

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Your chirp was deleted')).toBeInTheDocument();
    expect(deleted).toEqual([mine.id]);
    expect(within(list).queryByText('Mine to delete')).not.toBeInTheDocument();
    expect(within(list).getByText('Stays put')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the chirp when the author cancels', async () => {
    const deleted = deleteAnswers();
    const { user, list, openButton } = await renderOwnChirp();

    await user.click(openButton);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(list).getByText('Mine to delete')).toBeInTheDocument();
    expect(deleted).toEqual([]);
  });

  it('keeps the dialog open with an alert when the delete fails, and retries', async () => {
    let fail = true;
    deleteAnswers(() => (fail ? HttpResponse.error() : new HttpResponse(null, { status: 204 })));
    const { user, list, openButton } = await renderOwnChirp();

    await user.click(openButton);
    const dialog = screen.getByRole('dialog', { name: 'Delete chirp?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The chirp wasn’t deleted.');
    expect(within(list).getByText('Mine to delete')).toBeInTheDocument();

    fail = false;
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(within(list).queryByText('Mine to delete')).not.toBeInTheDocument();
    });
  });

  it('clears an earlier failure when the dialog is opened again', async () => {
    deleteAnswers(() => HttpResponse.error());
    const { user, openButton } = await renderOwnChirp();

    await user.click(openButton);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(openButton);

    expect(
      within(screen.getByRole('dialog', { name: 'Delete chirp?' })).queryByRole('alert'),
    ).not.toBeInTheDocument();
  });

  it('treats a chirp that is already gone as deleted', async () => {
    deleteAnswers(() => apiError(404, 'NOT_FOUND', 'Tweet not found'));
    const { user, list, openButton } = await renderOwnChirp();

    await user.click(openButton);
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Your chirp was deleted')).toBeInTheDocument();
    expect(within(list).queryByText('Mine to delete')).not.toBeInTheDocument();
  });
});
