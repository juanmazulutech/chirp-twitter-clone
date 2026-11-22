import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('App', () => {
  it('renders the route matching the browser location', async () => {
    // Imported here, not at the top: the module asks for the session as it loads, and the
    // network mock only starts listening once the tests begin.
    const { App } = await import('./App');
    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/home');
  });
});
