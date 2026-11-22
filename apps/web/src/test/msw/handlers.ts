import type { CreateTweetBody, ErrorResponse, SessionUser } from '@chirp/shared';
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

/** Handlers every test starts with: the app shell asks for the session on every screen. */
export const baseHandlers = [signedIn()];
