import { type APIRequestContext, test as base } from '@playwright/test';

export interface Account {
  displayName: string;
  username: string;
  email: string;
  password: string;
}

/** A fresh account per test, so specs never depend on each other or on run order. */
export function newAccount(): Account {
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 11);
  return {
    displayName: 'E2E Tester',
    username: `e2e_${suffix}`,
    email: `e2e_${suffix}@example.test`,
    password: 'correct horse battery',
  };
}

/** Publishes a chirp through the API as whoever the request context is signed in as. */
export async function postChirp(request: APIRequestContext, content: string): Promise<void> {
  const response = await request.post('/api/tweets', { data: { content } });
  if (!response.ok()) throw new Error(`Could not post a chirp: ${response.status()}`);
}

/**
 * `account`: a new user, signed in. Registering goes through the API, not the form (the
 * auth spec covers the form): `page.request` shares the browser's cookies, so the page
 * starts with the session already set.
 */
export const test = base.extend<{ account: Account }>({
  account: async ({ page }, use) => {
    const account = newAccount();
    const response = await page.request.post('/api/auth/register', { data: account });
    if (!response.ok())
      throw new Error(`Could not register ${account.username}: ${response.status()}`);
    await use(account);
  },
});

export { expect } from '@playwright/test';
