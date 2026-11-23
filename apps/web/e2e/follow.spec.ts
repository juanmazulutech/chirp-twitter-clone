import { expect, test } from './fixtures';

// A seeded persona with chirps of her own (apps/api/prisma/seed-data).
const ANA = { username: 'ana_codes', displayName: 'Ana Torres' };

test('following someone brings their chirps to home, unfollowing takes them away', async ({
  page,
  account: _account,
}) => {
  const anasChirps = page.getByRole('article', { name: `Chirp by ${ANA.displayName}` });

  await page.goto('/home');
  await expect(page.getByText('Your timeline is quiet')).toBeVisible();

  await page.goto(`/${ANA.username}`);
  const follow = page.getByRole('button', { name: 'Follow', exact: true });
  await follow.click();
  const following = page.getByRole('button', { name: 'Following', exact: true });
  await expect(following).toHaveAttribute('aria-pressed', 'true');

  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Home' })
    .click();
  await expect(anasChirps.first()).toBeVisible();

  await page.goto(`/${ANA.username}`);
  await following.click();
  await expect(follow).toHaveAttribute('aria-pressed', 'false');

  await page.goto('/home');
  await expect(page.getByText('Your timeline is quiet')).toBeVisible();
  await expect(anasChirps).toHaveCount(0);
});
