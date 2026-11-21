import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

describe('WelcomePage', () => {
  it('shows the product name', async () => {
    server.use(http.get('/api/health', () => HttpResponse.json({ status: 'ok' })));

    renderRoute('/');

    expect(screen.getByRole('heading', { name: 'Chirp' })).toBeInTheDocument();
    expect(await screen.findByText('API: online')).toHaveAttribute('role', 'status');
  });

  it('reports the API as offline when it is unreachable', async () => {
    server.use(http.get('/api/health', () => HttpResponse.json({}, { status: 503 })));

    renderRoute('/');

    expect(await screen.findByText('API: offline')).toHaveAttribute('role', 'status');
  });

  it('shows the pending state while checking', () => {
    server.use(http.get('/api/health', () => new Promise(() => {})));

    renderRoute('/');

    expect(screen.getByRole('status')).toHaveTextContent('API: checking…');
  });
});
