import type { CreateTweetBody, ErrorResponse, Page, SessionUser, Tweet } from '@chirp/shared';
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

/**
 * `GET /api/timeline` serving `pages` in order: the first without a cursor, then each
 * page's `nextCursor` leads to the one after it. `onCursor` sees every cursor requested.
 */
export function timelinePages(
  pages: Tweet[][] = [[]],
  onCursor: (cursor: string | null) => void = () => {},
) {
  return http.get('/api/timeline', ({ request }) => {
    const cursor = new URL(request.url).searchParams.get('cursor');
    onCursor(cursor);
    const index = cursor === null ? 0 : Number(cursor.replace('page-', ''));
    const page: Page<Tweet> = {
      items: pages[index] ?? [],
      nextCursor: index + 1 < pages.length ? `page-${index + 1}` : null,
    };
    return HttpResponse.json(page);
  });
}

/**
 * Handlers every test starts with: the app shell asks for the session on every screen,
 * and the home page for a timeline (empty unless a test serves one).
 */
export const baseHandlers = [signedIn(), timelinePages()];
