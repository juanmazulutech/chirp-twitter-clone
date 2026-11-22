import type { UpdateProfileBody, UserProfile } from '@chirp/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { profileFixture, sessionUser } from '@/test/fixtures';
import { apiError } from '@/test/msw/errors';
import { profileFound, userTweetsPages } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

const me = profileFixture({
  id: sessionUser.id,
  username: sessionUser.username,
  displayName: sessionUser.displayName,
  bio: 'Writes code.',
  isMe: true,
});

/** `PATCH /api/users/me` saving like the API; `onBody` sees what the client sent. */
function profileSaved(onBody: (body: UpdateProfileBody) => void = () => {}) {
  return http.patch('/api/users/me', async ({ request }) => {
    const body = (await request.json()) as UpdateProfileBody;
    onBody(body);
    const saved: UserProfile = { ...me, ...body };
    return HttpResponse.json(saved);
  });
}

async function openEditor() {
  server.use(profileFound(me), userTweetsPages(me.username));
  const user = userEvent.setup();
  renderRoute(`/${me.username}`);
  await user.click(await screen.findByRole('button', { name: 'Edit profile' }));
  const dialog = screen.getByRole('dialog', { name: 'Edit profile' });
  return {
    user,
    dialog,
    name: within(dialog).getByRole('textbox', { name: 'Name' }),
    bio: within(dialog).getByRole('textbox', { name: 'Bio' }),
    save: within(dialog).getByRole('button', { name: 'Save' }),
  };
}

describe('EditProfileModal', () => {
  it('starts from the saved profile, with Save off until something changes', async () => {
    const { name, bio, save, dialog } = await openEditor();

    expect(name).toHaveValue('Ana Torres');
    expect(bio).toHaveValue('Writes code.');
    expect(name).toHaveFocus();
    expect(save).toBeDisabled();
    expect(within(dialog).getByText('40 characters left')).toBeInTheDocument();
    expect(within(dialog).getByText('148 characters left')).toBeInTheDocument();
  });

  it('saves, closes, confirms and shows the new name everywhere at once', async () => {
    const bodies: UpdateProfileBody[] = [];
    server.use(profileSaved((body) => bodies.push(body)));
    const { user, name, bio, save } = await openEditor();

    await user.clear(name);
    await user.type(name, 'Ana T.');
    await user.clear(bio);
    await user.type(bio, 'Ships small things.');
    await user.click(save);

    expect(await screen.findByText('Your profile is saved')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(bodies).toEqual([{ displayName: 'Ana T.', bio: 'Ships small things.' }]);
    expect(screen.getByRole('heading', { level: 1, name: 'Ana T.' })).toBeInTheDocument();
    // The closed dialog's textarea holds the same words; the header shows them as a paragraph.
    expect(screen.getByText('Ships small things.', { selector: 'p' })).toBeInTheDocument();
  });

  it('counts the name in code points and flags going over the limit', async () => {
    const { user, name, dialog } = await openEditor();

    await user.clear(name);
    await user.type(name, '🐦'.repeat(51));

    expect(within(dialog).getByText('1 over the limit')).toBeInTheDocument();
    expect(name).toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps the dialog open with the reason when the name is blank', async () => {
    let requests = 0;
    server.use(profileSaved(() => (requests += 1)));
    const { user, name, save } = await openEditor();

    await user.clear(name);
    await user.click(save);

    expect(await screen.findByText('Enter your name')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Edit profile' })).toBeInTheDocument();
    expect(requests).toBe(0);
  });

  it('puts a server’s field message on its field', async () => {
    server.use(
      http.patch('/api/users/me', () =>
        apiError(400, 'VALIDATION_ERROR', 'Invalid request', {
          bio: ['Use at most 160 characters'],
        }),
      ),
    );
    const { user, bio, save } = await openEditor();

    await user.type(bio, ' More.');
    await user.click(save);

    expect(await screen.findByText('Use at most 160 characters')).toBeInTheDocument();
    expect(bio).toHaveAttribute('aria-invalid', 'true');
  });

  it('says so in the dialog when the server cannot be reached', async () => {
    server.use(http.patch('/api/users/me', () => HttpResponse.error()));
    const { user, bio, save, dialog } = await openEditor();

    await user.type(bio, ' More.');
    await user.click(save);

    expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Edit profile' })).toBeInTheDocument();
  });

  it('drops unsaved edits on cancel', async () => {
    const { user, name } = await openEditor();

    await user.type(name, ' changed');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Edit profile' }));

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ana Torres');
  });
});
