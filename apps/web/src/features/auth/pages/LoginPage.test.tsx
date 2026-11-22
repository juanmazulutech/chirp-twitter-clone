import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { authResponse } from '@/test/fixtures';
import { apiError } from '@/test/msw/errors';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

import { DEMO_ACCOUNT } from '../demo-account';

async function openLogin() {
  const user = userEvent.setup();
  const view = renderRoute('/login');
  await screen.findByRole('heading', { level: 1, name: 'Sign in to Chirp' });
  return { user, ...view };
}

const emailField = () => screen.getByRole('textbox', { name: 'Email' });
const passwordField = () => screen.getByLabelText('Password');
const signInButton = () => screen.getByRole('button', { name: 'Sign in' });

describe('LoginPage', () => {
  it('signs in, loads the session and opens the home timeline', async () => {
    let body: unknown;
    server.use(
      http.post('/api/auth/login', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(authResponse);
      }),
    );
    const { user, router } = await openLogin();

    await user.type(emailField(), ' Ana@Chirp.dev ');
    await user.type(passwordField(), 'Password123!');
    await user.click(signInButton());

    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/home');
    // The session was loaded before the shell appeared, so it opens signed in.
    expect(screen.getAllByRole('link', { name: 'Profile' }).length).toBeGreaterThan(0);
    // The shared schema normalizes what is sent.
    expect(body).toEqual({ email: 'ana@chirp.dev', password: 'Password123!' });
  });

  it('checks the fields before sending anything', async () => {
    const { user } = await openLogin();

    await user.click(signInButton());

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(emailField()).toHaveAttribute('aria-invalid', 'true');
    expect(emailField()).toHaveFocus();
  });

  it('says the credentials do not match, without saying which one', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        apiError(401, 'UNAUTHENTICATED', 'Invalid email or password'),
      ),
    );
    const { user } = await openLogin();

    await user.type(emailField(), 'ana@chirp.dev');
    await user.type(passwordField(), 'wrong-password');
    await user.click(signInButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That email and password don’t match. Check both and try again.',
    );
    expect(emailField()).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in to Chirp' })).toBeInTheDocument();
  });

  it('asks to wait after too many attempts', async () => {
    server.use(
      http.post('/api/auth/login', () => apiError(429, 'RATE_LIMITED', 'Too many requests')),
    );
    const { user } = await openLogin();

    await user.type(emailField(), 'ana@chirp.dev');
    await user.type(passwordField(), 'Password123!');
    await user.click(signInButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Wait a minute and try again.',
    );
  });

  it('explains a dropped connection', async () => {
    server.use(http.post('/api/auth/login', () => HttpResponse.error()));
    const { user } = await openLogin();

    await user.type(emailField(), 'ana@chirp.dev');
    await user.type(passwordField(), 'Password123!');
    await user.click(signInButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(/check your connection/i);
  });

  it('shows the button as busy while signing in', async () => {
    let respond: () => void = () => {};
    server.use(
      http.post(
        '/api/auth/login',
        () =>
          new Promise<Response>((resolve) => {
            respond = () => {
              resolve(HttpResponse.json(authResponse));
            };
          }),
      ),
    );
    const { user } = await openLogin();

    await user.type(emailField(), 'ana@chirp.dev');
    await user.type(passwordField(), 'Password123!');
    await user.click(signInButton());

    expect(signInButton()).toHaveAttribute('aria-busy', 'true');
    expect(signInButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Use the demo account' })).toBeDisabled();

    respond();
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
  });

  it('fills in the demo account without signing in', async () => {
    const { user, router } = await openLogin();

    await user.click(screen.getByRole('button', { name: 'Use the demo account' }));

    expect(emailField()).toHaveValue(DEMO_ACCOUNT.email);
    expect(passwordField()).toHaveValue(DEMO_ACCOUNT.password);
    expect(passwordField()).toHaveFocus();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('shows and hides the password', async () => {
    const { user } = await openLogin();
    const toggle = screen.getByRole('button', { name: 'Show password' });

    expect(passwordField()).toHaveAttribute('type', 'password');
    await user.click(toggle);
    expect(passwordField()).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await user.click(toggle);
    expect(passwordField()).toHaveAttribute('type', 'password');
  });

  it('links to account creation', async () => {
    await openLogin();

    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/register',
    );
    expect(document.title).toBe('Sign in to Chirp · Chirp');
  });
});
