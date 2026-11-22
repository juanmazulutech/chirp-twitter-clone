import { z } from 'zod';

/** What a route guard leaves in the history entry of `/login` when it sends someone there. */
export interface ReturnToState {
  from: string;
}

interface PathParts {
  pathname: string;
  search: string;
  hash: string;
}

export function returnToState({ pathname, search, hash }: PathParts): ReturnToState {
  return { from: `${pathname}${search}${hash}` };
}

const returnToStateSchema = z.object({ from: z.string() });

/**
 * The page to go back to after signing in, or `null`. History state is untrusted input
 * (anything on the page can write it), so only an in-app path is accepted: `//host` and
 * `/\host` would leave the site, and the sign-in screens would loop.
 */
export function returnToPath(state: unknown): string | null {
  const parsed = returnToStateSchema.safeParse(state);
  if (!parsed.success) return null;
  const { from } = parsed.data;
  if (!from.startsWith('/') || from.startsWith('//') || from.startsWith('/\\')) return null;
  if (/^\/(login|register)(?:[/?#]|$)/.test(from)) return null;
  return from;
}
