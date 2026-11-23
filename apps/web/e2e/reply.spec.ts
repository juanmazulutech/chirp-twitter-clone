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
  await page.getByRole('button', { name: 'Reply', exact: true }).click();

  const reply = page.getByRole('article').filter({ hasText: answer });
  await expect(reply).toContainText(`Replying to @${account.username}`);
  // Beside faded text, colour alone would not mark it as a link (WCAG 1.4.1).
  await expect(reply.getByRole('link', { name: `@${account.username}` })).toHaveCSS(
    'text-decoration-line',
    'underline',
  );
  const focused = page.getByRole('article').filter({ hasText: original });
  await expect(focused).toContainText('1 reply');

  await page.goBack();
  await expect(chirp.getByRole('link', { name: 'Reply, 1 reply' })).toBeVisible();

  // The profile keeps chirps and replies apart.
  await page.goto(`/${account.username}/replies`);
  const replies = page.getByRole('list', { name: `Replies by ${account.displayName}` });
  await expect(replies.getByRole('article').filter({ hasText: answer })).toBeVisible();
  await expect(replies.getByRole('article').filter({ hasText: original })).toHaveCount(0);
  await page.getByRole('link', { name: 'Chirps', exact: true }).click();
  await expect(page).toHaveURL(`/${account.username}`);
  const chirps = page.getByRole('list', { name: `Chirps by ${account.displayName}` });
  await expect(chirps.getByRole('article').filter({ hasText: original })).toBeVisible();
  await expect(chirps.getByRole('article').filter({ hasText: answer })).toHaveCount(0);
});
