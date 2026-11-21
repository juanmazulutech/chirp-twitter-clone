import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/render';

import { RouteErrorPage } from './layout/RouteErrorPage';

describe('routes', () => {
  it('sends the root path to the home timeline', async () => {
    const { router } = renderRoute('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/home');
  });

  it.each([
    ['/home', 'Home'],
    ['/search', 'Search'],
    ['/notifications', 'Notifications'],
    ['/ana_codes', '@ana_codes'],
    ['/ana_codes/followers', 'People following @ana_codes'],
    ['/ana_codes/following', 'People @ana_codes follows'],
  ])('renders %s inside the app shell', async (path, heading) => {
    renderRoute(path);

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('Chirp');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });

  it.each([
    ['/login', 'Sign in'],
    ['/register', 'Create your account'],
  ])('renders %s without the app shell', async (path, heading) => {
    renderRoute(path);

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('names the browser tab after the page', async () => {
    renderRoute('/search');

    await waitFor(() => {
      expect(document.title).toBe('Search · Chirp');
    });
  });

  it('shows a not-found page, with the shell, for an unknown address', async () => {
    renderRoute('/ana_codes/no/such/page');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to your timeline' })).toHaveAttribute(
      'href',
      '/home',
    );
    expect(screen.getAllByRole('navigation', { name: 'Primary' }).length).toBeGreaterThan(0);
  });

  it('offers a reload when a route fails to load', async () => {
    renderRoute('/broken', {
      routes: [
        {
          path: '/broken',
          errorElement: <RouteErrorPage />,
          lazy: () => Promise.reject(new Error('Failed to fetch dynamically imported module')),
        },
      ],
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('This page didn’t load');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });
});
