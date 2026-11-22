import type { FollowState } from '@chirp/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { profileFixture, sessionUser, tweetFixture } from '@/test/fixtures';
import { apiError } from '@/test/msw/errors';
import { profileFound, timelinePages, userTweetsPages } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

const bruno = profileFixture();
const brunoAsAuthor = {
  id: bruno.id,
  username: bruno.username,
  displayName: bruno.displayName,
  avatarUrl: null,
};

/** A response the test releases when it is ready, to look at the UI while a request is open. */
function gate() {
  let release: () => void = () => {};
  const opened = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { opened, release };
}

function followAnswers(state: FollowState, until: Promise<void> = Promise.resolve()) {
  const resolver = async () => {
    await until;
    return HttpResponse.json(state);
  };
  return [
    http.post('/api/users/bruno/follow', resolver),
    http.delete('/api/users/bruno/follow', resolver),
  ];
}

async function renderProfile(path = '/bruno') {
  const user = userEvent.setup();
  const rendered = renderRoute(path);
  await screen.findByRole('heading', { level: 1, name: bruno.displayName });
  const header = screen.getByRole('region', { name: 'Profile' });
  return { user, header, ...rendered };
}

describe('ProfilePage', () => {
  it('shows who the person is, their counts and their chirps', async () => {
    server.use(
      profileFound(bruno),
      userTweetsPages('bruno', [[tweetFixture({ content: 'Fresh bread', author: brunoAsAuthor })]]),
    );
    const { header } = await renderProfile();

    expect(within(header).getByText('@bruno')).toBeInTheDocument();
    expect(within(header).getByText('Bakes bread, ships code.')).toBeInTheDocument();
    expect(within(header).getByText('Joined April 2026')).toBeInTheDocument();
    expect(within(header).getByRole('link', { name: '12 Following' })).toHaveAttribute(
      'href',
      '/bruno/following',
    );
    expect(within(header).getByRole('link', { name: '8 Followers' })).toHaveAttribute(
      'href',
      '/bruno/followers',
    );
    const list = await screen.findByRole('list', { name: 'Chirps by Bruno Silva' });
    expect(within(list).getByText('Fresh bread')).toBeInTheDocument();
    expect(document.title).toBe('Bruno Silva · Chirp');
  });

  it('counts a single follower in the singular', async () => {
    server.use(profileFound(profileFixture({ followersCount: 1 })), userTweetsPages('bruno'));
    const { header } = await renderProfile();

    expect(within(header).getByRole('link', { name: '1 Follower' })).toBeInTheDocument();
  });

  it('opens the same profile whatever the case of the address', async () => {
    const requested: string[] = [];
    server.use(
      http.get('/api/users/:username', ({ params }) => {
        requested.push(String(params.username));
        return HttpResponse.json(bruno);
      }),
      userTweetsPages('bruno'),
    );
    await renderProfile('/Bruno');

    expect(requested).toEqual(['bruno']);
  });

  it('says so when the person has not posted yet', async () => {
    server.use(profileFound(bruno), userTweetsPages('bruno'));
    await renderProfile();

    expect(
      await screen.findByRole('heading', { level: 2, name: 'No chirps yet' }),
    ).toBeInTheDocument();
    expect(screen.getByText('When @bruno posts, it will appear here.')).toBeInTheDocument();
  });

  it('offers no follow button on your own profile', async () => {
    const me = profileFixture({
      ...brunoAsAuthor,
      id: sessionUser.id,
      username: 'bruno',
      isMe: true,
    });
    server.use(profileFound(me), userTweetsPages('bruno'));
    const { header } = await renderProfile();

    expect(within(header).queryByRole('button', { name: /follow/i })).not.toBeInTheDocument();
    expect(await screen.findByText('What you post will appear here.')).toBeInTheDocument();
  });

  it('follows at once, keeps the server’s count and refreshes the home timeline', async () => {
    const response = gate();
    let timelineRequests = 0;
    server.use(
      profileFound(bruno),
      userTweetsPages('bruno'),
      ...followAnswers({ isFollowing: true, followersCount: 10 }, response.opened),
      timelinePages([[]], () => {
        timelineRequests += 1;
      }),
    );
    const { user, header, router } = await renderProfile();
    const button = within(header).getByRole('button', { name: 'Follow' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);

    expect(within(header).getByRole('button', { name: 'Following' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(header).getByRole('link', { name: '9 Followers' })).toBeInTheDocument();

    response.release();

    expect(await within(header).findByRole('link', { name: '10 Followers' })).toBeInTheDocument();
    await router.navigate('/home');
    await waitFor(() => {
      expect(timelineRequests).toBe(1);
    });
  });

  it('unfollows someone you follow', async () => {
    server.use(
      profileFound(profileFixture({ isFollowing: true, followersCount: 8 })),
      userTweetsPages('bruno'),
      ...followAnswers({ isFollowing: false, followersCount: 7 }),
    );
    const { user, header } = await renderProfile();

    await user.click(within(header).getByRole('button', { name: 'Following' }));

    expect(within(header).getByRole('button', { name: 'Follow' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(await within(header).findByRole('link', { name: '7 Followers' })).toBeInTheDocument();
  });

  it.each([
    [false, 'The follow didn’t go through. Try again.', 'Follow', '8 Followers'],
    [true, 'You’re still following. Try again.', 'Following', '8 Followers'],
  ])(
    'rolls back and says so when the toggle fails (following: %s)',
    async (isFollowing, message, label, count) => {
      server.use(
        profileFound(profileFixture({ isFollowing })),
        userTweetsPages('bruno'),
        http.post('/api/users/bruno/follow', () => HttpResponse.error()),
        http.delete('/api/users/bruno/follow', () => HttpResponse.error()),
      );
      const { user, header } = await renderProfile();

      await user.click(within(header).getByRole('button', { name: label }));

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(within(header).getByRole('button', { name: label })).toBeInTheDocument();
      expect(within(header).getByRole('link', { name: count })).toBeInTheDocument();
    },
  );

  it('explains an unknown account and points to search', async () => {
    server.use(
      http.get('/api/users/ghost', () => apiError(404, 'NOT_FOUND', 'User not found')),
      http.get('/api/users/ghost/tweets', () => apiError(404, 'NOT_FOUND', 'User not found')),
    );
    renderRoute('/ghost');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'This account doesn’t exist' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Search people' })).toHaveAttribute('href', '/search');
  });

  it('offers a retry when the profile fails to load', async () => {
    server.use(
      http.get('/api/users/bruno', () => HttpResponse.error(), { once: true }),
      profileFound(bruno),
      userTweetsPages('bruno'),
    );
    const user = userEvent.setup();
    renderRoute('/bruno');

    expect(await screen.findByRole('alert')).toHaveTextContent('This profile didn’t load');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: bruno.displayName }),
    ).toBeInTheDocument();
  });
});
