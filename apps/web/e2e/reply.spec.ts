import { expect, postChirp, test } from './fixtures';

test('a reply appears in the conversation and raises the reply count', async ({
  page,
  account,
}) => {
  // A chirp of the test's own: a seeded one could be answered by a parallel run meanwhile.
  const original = `Question from ${account.username}`;
  const answer = `Answer to ${account.username}`;
  await postChirp(page.request, original);

  await page.goto('/home');
  const chirp = page
    .getByRole('article', { name: `Chirp by ${account.displayName}` })
    .filter({ hasText: original });
  await chirp.getByRole('link', { name: 'Reply, 0 replies' }).click();

  await expect(page).toHaveURL(new RegExp(`/${account.username}/status/`));
  const replyBox = page.getByRole('textbox', { name: `Reply to @${account.username}` });
  await expect(replyBox).toBeFocused();

  await replyBox.fill(answer);
  await page.locator('form', { has: replyBox }).getByRole('button', { name: 'Reply' }).click();

  const reply = page.getByRole('article').filter({ hasText: answer });
  await expect(reply).toContainText(`Replying to @${account.username}`);
  const focused = page.getByRole('article').filter({ hasText: original });
  await expect(focused).toContainText('1 reply');

  await page.goBack();
  await expect(chirp.getByRole('link', { name: 'Reply, 1 reply' })).toBeVisible();
});
