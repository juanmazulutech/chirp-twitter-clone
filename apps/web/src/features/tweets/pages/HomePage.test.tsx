import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { tweetFixture } from '@/test/fixtures';
import { observedCount, scrollToEnd } from '@/test/intersection-observer';
import { apiError } from '@/test/msw/errors';
import { timelinePages, tweetCreated } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

function timelineFailsOnce(failure: () => Response = () => HttpResponse.error()) {
  return http.get('/api/timeline', failure, { once: true });
}

/** The chirps in the list, in order, each matched by its own content. */
function expectChirps(list: HTMLElement, contents: string[]) {
  const articles = within(list).getAllByRole('article');
  expect(articles).toHaveLength(contents.length);
  contents.forEach((content, index) => {
    expect(articles[index]).toHaveTextContent(content);
  });
}

async function renderHome() {
  const user = userEvent.setup();
  const rendered = renderRoute('/home');
  await screen.findByRole('heading', { level: 1, name: 'Home' });
  return { user, ...rendered };
}

describe('HomePage', () => {
  it('shows the first page of the timeline, newest first', async () => {
    const page = [tweetFixture({ content: 'Newest' }), tweetFixture({ content: 'Older' })];
    server.use(timelinePages([page]));
    await renderHome();

    expect(screen.getByRole('img', { name: 'Loading chirps' })).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Home timeline' });

    expectChirps(list, ['Newest', 'Older']);
    expect(screen.queryByRole('img', { name: 'Loading chirps' })).not.toBeInTheDocument();
  });

  it('loads the next page at the end of the list until there is none', async () => {
    const cursors: (string | null)[] = [];
    server.use(
      timelinePages(
        [[tweetFixture({ content: 'Page one' })], [tweetFixture({ content: 'Page two' })]],
        (cursor) => cursors.push(cursor),
      ),
    );
    await renderHome();
    const list = await screen.findByRole('list', { name: 'Home timeline' });
    expect(screen.queryByText('You’re all caught up.')).not.toBeInTheDocument();

    scrollToEnd();

    expect(await screen.findByText('Page two')).toBeInTheDocument();
    expectChirps(list, ['Page one', 'Page two']);
    expect(screen.getByText('You’re all caught up.')).toBeInTheDocument();
    expect(cursors).toEqual([null, 'page-1']);
    // Nothing is left to load, so the sentinel is gone.
    expect(observedCount()).toBe(0);
  });

  it('shows a chirp that comes back in a later page only once', async () => {
    const repeated = tweetFixture({ content: 'Seen twice' });
    server.use(timelinePages([[repeated], [repeated, tweetFixture({ content: 'New one' })]]));
    await renderHome();
    const list = await screen.findByRole('list', { name: 'Home timeline' });

    scrollToEnd();

    await screen.findByText('New one');
    expectChirps(list, ['Seen twice', 'New one']);
  });

  it('points a quiet timeline to search', async () => {
    await renderHome();

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Your timeline is quiet' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Find people to follow' })).toHaveAttribute(
      'href',
      '/search',
    );
    expect(screen.queryByRole('list', { name: 'Home timeline' })).not.toBeInTheDocument();
  });

  it('explains a timeline that did not load and tries again', async () => {
    server.use(timelinePages([[tweetFixture({ content: 'Back online' })]]));
    server.use(timelineFailsOnce(() => apiError(500, 'INTERNAL_ERROR', 'Something went wrong')));
    const { user } = await renderHome();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByRole('heading', { name: 'Chirps didn’t load' })).toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Back online')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the loaded chirps when the next page fails, and retries on request', async () => {
    server.use(
      timelinePages([
        [tweetFixture({ content: 'Already here' })],
        [tweetFixture({ content: 'Second try' })],
      ]),
    );
    const { user } = await renderHome();
    await screen.findByText('Already here');
    server.use(timelineFailsOnce());

    scrollToEnd();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('More chirps didn’t load.');
    expect(screen.getByText('Already here')).toBeInTheDocument();
    // Scrolling does not hammer a failing request; only the button retries.
    expect(observedCount()).toBe(0);

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Second try')).toBeInTheDocument();
    expect(screen.getByText('You’re all caught up.')).toBeInTheDocument();
  });

  it('marks the list busy while the next page loads', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      timelinePages([[tweetFixture({ content: 'First' })], [tweetFixture({ content: 'Next' })]]),
    );
    await renderHome();
    const list = await screen.findByRole('list', { name: 'Home timeline' });
    server.use(
      http.get(
        '/api/timeline',
        async () => {
          await gate;
          return HttpResponse.json({
            items: [tweetFixture({ content: 'Next' })],
            nextCursor: null,
          });
        },
        { once: true },
      ),
    );

    scrollToEnd();

    expect(await screen.findByRole('img', { name: 'Loading more chirps' })).toBeInTheDocument();
    expect(list).toHaveAttribute('aria-busy', 'true');

    release();

    expect(await screen.findByText('Next')).toBeInTheDocument();
    await waitFor(() => {
      expect(list).toHaveAttribute('aria-busy', 'false');
    });
  });

  it('puts a chirp posted from the composer at the top of the timeline', async () => {
    server.use(timelinePages([[tweetFixture({ content: 'Earlier' })]]), tweetCreated());
    const { user } = await renderHome();
    const list = await screen.findByRole('list', { name: 'Home timeline' });

    await user.type(screen.getByRole('textbox', { name: 'What’s happening?' }), 'Just now');
    await user.click(screen.getByRole('button', { name: 'Chirp' }));

    await within(list).findByText('Just now');
    expectChirps(list, ['Just now', 'Earlier']);
  });
});
