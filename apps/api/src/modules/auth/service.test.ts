// Service-level cases that HTTP tests cannot trigger deterministically.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { resetDatabase } from '../../../test/database';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';
import { ConflictError } from '../../lib/errors';
import { createAuthService } from './service';

describe('auth service', () => {
  let app: App;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app.prisma);
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  const input = {
    email: 'ana@chirp.dev',
    username: 'ana',
    displayName: 'Ana',
    password: 'Password123!',
  };

  // Simulates another request registering the same identifier between the
  // availability check and the insert.
  async function registerAfterLostRace(override: Partial<typeof input>) {
    vi.spyOn(app.prisma.user, 'findMany').mockResolvedValueOnce([]);
    const auth = createAuthService({ prisma: app.prisma, sessionTtlDays: 30 });
    return auth.register({ ...input, ...override }).catch((error: unknown) => error);
  }

  it('maps a lost race on the email to an email conflict', async () => {
    await createUser(app.prisma, { email: 'ana@chirp.dev' });

    const error = await registerAfterLostRace({ username: 'someone_else' });

    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).fieldErrors).toEqual({
      email: ['This email is already registered'],
    });
  });

  it('maps a lost race on the username to a username conflict', async () => {
    await createUser(app.prisma, { username: 'ana' });

    const error = await registerAfterLostRace({ email: 'other@chirp.dev' });

    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).fieldErrors).toEqual({ username: ['This username is taken'] });
  });

  it('lets unexpected database errors propagate', async () => {
    vi.spyOn(app.prisma.user, 'create').mockRejectedValueOnce(new Error('connection lost'));
    const auth = createAuthService({ prisma: app.prisma, sessionTtlDays: 30 });

    await expect(auth.register(input)).rejects.toThrow('connection lost');
  });

  it('uses the injected clock for session expiry', async () => {
    const user = await createUser(app.prisma);
    const now = new Date('2026-01-01T00:00:00.000Z');
    const auth = createAuthService({ prisma: app.prisma, sessionTtlDays: 7, now: () => now });

    const { expiresAt } = await auth.createSession(user.id);

    expect(expiresAt).toEqual(new Date('2026-01-08T00:00:00.000Z'));
  });
});
