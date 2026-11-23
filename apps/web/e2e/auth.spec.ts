import { expect, type Page, test } from '@playwright/test';

import { type Account, newAccount } from './fixtures';

// Seeded by global-setup (apps/api/prisma/seed-data/users.ts).
const DEMO_USERNAME = 'demo';

async function register(page: Page, account: Account) {
  await page.goto('/register');
  await page.getByLabel('Name', { exact: true }).fill(account.displayName);
  await page.getByLabel('Username', { exact: true }).fill(account.username);
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Create account' }).click();
}

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('registers, signs out and signs back in', async ({ page }) => {
  const account = newAccount();

  await register(page, account);
  // A new account starts on Search to find people to follow.
  await expect(page).toHaveURL('/search');
  await expect(page.getByRole('heading', { name: 'Search', level: 1 })).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/login');

  await signIn(page, account.email, account.password);
  await expect(page).toHaveURL('/home');
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Profile' }),
  ).toHaveAttribute('href', `/${account.username}`);
});

test('sends a signed-out visitor to sign in, then back to the page they asked for', async ({
  page,
}) => {
  await page.goto('/notifications');
  await expect(page).toHaveURL('/login');

  await page.getByRole('button', { name: 'Use the demo account' }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/notifications');
  await expect(page.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible();
});

test('keeps a visitor out once they sign out', async ({ page }) => {
  await register(page, newAccount());
  await expect(page).toHaveURL('/search');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/login');

  await page.goto('/home');
  await expect(page).toHaveURL('/login');
});

test('rejects a wrong password without saying which field was wrong', async ({ page }) => {
  await page.goto('/login');
  await signIn(page, `${DEMO_USERNAME}@chirp.dev`, 'not the password');

  await expect(page.getByRole('alert')).toHaveText(/email and password don.t match/i);
  await expect(page).toHaveURL('/login');
});

test('refuses a username that is already taken', async ({ page }) => {
  await register(page, { ...newAccount(), username: DEMO_USERNAME });

  await expect(page.getByLabel('Username', { exact: true })).toHaveAccessibleDescription(
    /this username is taken/i,
  );
  await expect(page).toHaveURL('/register');
});
