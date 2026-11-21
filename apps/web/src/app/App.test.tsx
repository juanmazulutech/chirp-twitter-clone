import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/msw/server';

import { App } from './App';

describe('App', () => {
  it('renders the route matching the browser location', async () => {
    server.use(http.get('/api/health', () => HttpResponse.json({ status: 'ok' })));

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Chirp' })).toBeInTheDocument();
    expect(await screen.findByText('API: online')).toBeInTheDocument();
  });
});
