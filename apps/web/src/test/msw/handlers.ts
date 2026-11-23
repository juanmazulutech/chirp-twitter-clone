import type {
  CreateTweetBody,
  ErrorResponse,
  FollowListUser,
  MarkNotificationsReadBody,
  Notification,
  Page,
  SessionUser,
  Tweet,
  UserProfile,
} from '@chirp/shared';
import { http, HttpResponse } from 'msw';

import { sessionUser, tweetFixture } from '../fixtures';

/** `GET /api/auth/me` answering with a session for `user`. */
export function signedIn(user: SessionUser = sessionUser) {
  return http.get('/api/auth/me', () => HttpResponse.json({ user }));
}

/** `GET /api/auth/me` answering 401, as the API does without a valid session cookie. */
export function signedOut() {
  return http.get('/api/auth/me', () =>
    HttpResponse.json<ErrorResponse>(
      { error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue' } },
      { status: 401 },
    ),
  );
}

/**
 * `POST /api/tweets` storing the chirp as the API would; `onBody` sees each request body,
 * so a test can assert what the client sent.
 */
export function tweetCreated(onBody: (body: CreateTweetBody) => void = () => {}) {
  return http.post('/api/tweets', async ({ request }) => {
    const body = (await request.json()) as CreateTweetBody;
    onBody(body);
    return HttpResponse.json(tweetFixture({ content: body.content }), { status: 201 });
  });
}

/** Serves `pages` in order: the first without a cursor, then `page-N` for each next one. */
function pagesFrom<Item>(
  pages: Item[][],
  request: Request,
  onCursor: (cursor: string | null) => void,
) {
  const cursor = new URL(request.url).searchParams.get('cursor');
  onCursor(cursor);
  const index = cursor === null ? 0 : Number(cursor.replace('page-', ''));
  const page: Page<Item> = {
    items: pages[index] ?? [],
    nextCursor: index + 1 < pages.length ? `page-${index + 1}` : null,
  };
  return HttpResponse.json(page);
}

/** `GET /api/users/:username` answering with `profile` (for its own username). */
export function profileFound(profile: UserProfile) {
  return http.get(`/api/users/${profile.username}`, () => HttpResponse.json(profile));
}

/** `GET /api/users/:username/tweets` serving `pages` like `timelinePages`. */
export function userTweetsPages(
  username: string,
  pages: Tweet[][] = [[]],
  onCursor: (cursor: string | null) => void = () => {},
) {
  return http.get(`/api/users/${username}/tweets`, ({ request }) =>
    pagesFrom(pages, request, onCursor),
  );
}

/** `GET /api/users/:username/replies` serving `pages` like `timelinePages`. */
export function userRepliesPages(username: string, pages: Tweet[][] = [[]]) {
  return http.get(`/api/users/${username}/replies`, ({ request }) =>
    pagesFrom(pages, request, () => {}),
  );
}

/** `GET /api/users/:username/followers` or `/following` serving `pages` like `timelinePages`. */
export function followListPages(
  username: string,
  list: 'followers' | 'following',
  pages: FollowListUser[][] = [[]],
) {
  return http.get(`/api/users/${username}/${list}`, ({ request }) =>
    pagesFrom(pages, request, () => {}),
  );
}

/**
 * `GET /api/users/search` answering with `results(term)` as one page; `onTerm` sees each `q`
 * the client sent.
 */
export function userSearchResults(
  results: (term: string) => FollowListUser[] = () => [],
  onTerm: (term: string) => void = () => {},
) {
  return http.get('/api/users/search', ({ request }) => {
    const term = new URL(request.url).searchParams.get('q') ?? '';
    onTerm(term);
    const page: Page<FollowListUser> = { items: results(term), nextCursor: null };
    return HttpResponse.json(page);
  });
}

/**
 * `GET /api/timeline` serving `pages` in order: the first without a cursor, then each
 * page's `nextCursor` leads to the one after it. `onCursor` sees every cursor requested.
 */
export function timelinePages(
  pages: Tweet[][] = [[]],
  onCursor: (cursor: string | null) => void = () => {},
) {
  return http.get('/api/timeline', ({ request }) => pagesFrom(pages, request, onCursor));
}

/** `GET /api/tweets/:id` answering with `tweet`. */
export function tweetFound(tweet: Tweet) {
  return http.get(`/api/tweets/${tweet.id}`, () => HttpResponse.json(tweet));
}

/** `GET /api/tweets/:id/ancestors` answering with `ancestors`, root first. */
function tweetAncestors(tweetId: string, ancestors: Tweet[] = []) {
  return http.get(`/api/tweets/${tweetId}/ancestors`, () =>
    HttpResponse.json({ items: ancestors }),
  );
}

/** `GET /api/tweets/:id/replies` serving `pages` like `timelinePages`. */
function tweetRepliesPages(
  tweetId: string,
  pages: Tweet[][] = [[]],
  onCursor: (cursor: string | null) => void = () => {},
) {
  return http.get(`/api/tweets/${tweetId}/replies`, ({ request }) =>
    pagesFrom(pages, request, onCursor),
  );
}

/** `GET /api/tweets/:id/likes` serving the people who liked it, `pages` in order. */
export function likersPages(tweetId: string, pages: FollowListUser[][] = [[]]) {
  return http.get(`/api/tweets/${tweetId}/likes`, ({ request }) =>
    pagesFrom(pages, request, () => {}),
  );
}

/** Everything a chirp's page asks for: the chirp, what it answers and its replies. */
export function threadOf(
  tweet: Tweet,
  { ancestors = [] as Tweet[], replies = [[]] as Tweet[][] } = {},
) {
  return [
    tweetFound(tweet),
    tweetAncestors(tweet.id, ancestors),
    tweetRepliesPages(tweet.id, replies),
  ];
}

/** `GET /api/notifications/unread-count`; `count` is read on every poll, so it can change. */
export function unreadCount(count: number | (() => number) = 0) {
  return http.get('/api/notifications/unread-count', () =>
    HttpResponse.json({ count: typeof count === 'number' ? count : count() }),
  );
}

/** `GET /api/notifications` serving `pages` in order. */
export function notificationPages(pages: Notification[][] = [[]]) {
  return http.get('/api/notifications', ({ request }) => pagesFrom(pages, request, () => {}));
}

/** `POST /api/notifications/read` answering 204; `onBody` sees what the client sent. */
export function notificationsMarkedRead(
  onBody: (body: MarkNotificationsReadBody) => void = () => {},
) {
  return http.post('/api/notifications/read', async ({ request }) => {
    onBody((await request.json()) as MarkNotificationsReadBody);
    return new HttpResponse(null, { status: 204 });
  });
}

/**
 * Handlers every test starts with: the app shell asks for the session and the unread count
 * on every screen, and the home page for a timeline (empty unless a test serves one).
 */
export const baseHandlers = [signedIn(), unreadCount(), timelinePages()];
