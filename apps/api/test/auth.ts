import type { App } from '../src/app';
import type { User } from '../src/generated/prisma/client';
import { SESSION_COOKIE } from '../src/plugins/session';

/** Opens a session for `user` and returns the `cookie` header that authenticates as them. */
export async function loginAs(app: App, user: Pick<User, 'id'>): Promise<string> {
  const { token } = await app.auth.createSession(user.id);
  return `${SESSION_COOKIE}=${token}`;
}
