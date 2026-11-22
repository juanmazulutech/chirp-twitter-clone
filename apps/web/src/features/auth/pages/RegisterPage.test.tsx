import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { authResponse } from '@/test/fixtures';
import { apiError } from '@/test/msw/errors';
import { signedIn } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { startSignedOut } from '@/test/msw/session';
import { renderRoute } from '@/test/render';

async function openRegister() {
  startSignedOut();
  const user = userEvent.setup();
  const view = renderRoute('/register');
  await screen.findByRole('heading', { level: 1, name: 'Create your account' });
  return { user, ...view };
}

const field = (name: string) => screen.getByRole('textbox', { name });
const passwordField = () => screen.getByLabelText('Password');
const createButton = () => screen.getByRole('button', { name: 'Create account' });

async function fillIn(user: ReturnType<typeof userEvent.setup>, username = 'Ana_Codes') {
  await user.type(field('Name'), 'Ana Torres');
  await user.type(field('Username'), username);
  await user.type(field('Email'), 'ana@chirp.dev');
  await user.type(passwordField(), 'Password123!');
}

describe('RegisterPage', () => {
  it('creates the account and opens search to find people to follow', async () => {
    let body: unknown;
    server.use(
      http.post('/api/auth/register', async ({ request }) => {
        body = await request.json();
        // The API set the session cookie: /auth/me answers with the user from now on.
        server.use(signedIn());
        return HttpResponse.json(authResponse, { status: 201 });
      }),
    );
    const { user, router } = await openRegister();

    await fillIn(user);
    await user.click(createButton());

    expect(await screen.findByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/search');
    expect(await screen.findByText(/Welcome to Chirp/)).toBeInTheDocument();
    expect(body).toEqual({
      displayName: 'Ana Torres',
      username: 'ana_codes',
      email: 'ana@chirp.dev',
      password: 'Password123!',
    });
  });

  it('puts a taken email and username on their fields and focuses the first', async () => {
    server.use(
      http.post('/api/auth/register', () =>
        apiError(409, 'CONFLICT', 'Already registered', {
          email: ['This email is already registered'],
          username: ['This username is taken'],
        }),
      ),
    );
    const { user } = await openRegister();

    await fillIn(user);
    await user.click(createButton());

    expect(await screen.findByText('This username is taken')).toBeInTheDocument();
    expect(screen.getByText('This email is already registered')).toBeInTheDocument();
    expect(field('Username')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Username')).toHaveFocus();
    // The fields say it all; no extra form-level alert.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rejects a username reserved for a page before sending', async () => {
    const { user } = await openRegister();

    await fillIn(user, 'search');
    await user.click(createButton());

    expect(await screen.findByText('This username is not available')).toBeInTheDocument();
  });

  it('asks for a longer password', async () => {
    const { user } = await openRegister();

    await user.type(passwordField(), 'short');
    await user.tab();

    expect(await screen.findByText('Use at least 8 characters')).toBeInTheDocument();
  });

  it('shows a form-level message when the failure is not about a field', async () => {
    server.use(http.post('/api/auth/register', () => HttpResponse.error()));
    const { user } = await openRegister();

    await fillIn(user);
    await user.click(createButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(/check your connection/i);
  });

  it('describes each field and links to sign-in', async () => {
    await openRegister();

    expect(field('Username')).toHaveAccessibleDescription(
      '3–15 letters, numbers or underscores. Your profile lives at /username.',
    );
    expect(passwordField()).toHaveAttribute('autocomplete', 'new-password');
    // Password managers save the email, which is what sign-in asks for.
    expect(field('Email')).toHaveAttribute('autocomplete', 'username');
    expect(field('Username')).toHaveAttribute('autocomplete', 'off');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });
});
