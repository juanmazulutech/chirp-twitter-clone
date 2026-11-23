import { expect, test } from './fixtures';

test('publishes a chirp at the top of the home timeline', async ({ page, account }) => {
  const content = `First chirp from ${account.username}`;
  await page.goto('/home');

  await page.getByRole('textbox', { name: /what.s happening/i }).fill(content);
  await page.getByRole('button', { name: 'Chirp', exact: true }).click();

  const chirp = page.getByRole('article', { name: `Chirp by ${account.displayName}` });
  await expect(chirp.filter({ hasText: content })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /what.s happening/i })).toHaveValue('');

  // Saved on the server, not only in the cache the composer updated.
  await page.reload();
  await expect(page.getByRole('article').first()).toContainText(content);
});
