// Database-level rules (uniqueness, defaults, cascades) verified against PostgreSQL.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { App } from '../src/app';
import { Prisma } from '../src/generated/prisma/client';
import { buildTestApp } from './app';
import { resetDatabase } from './database';
import { createFollow } from './factories/follows';
import { createLike } from './factories/likes';
import { createTweet } from './factories/tweets';
import { createUser } from './factories/users';

describe('database schema', () => {
  let app: App;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app.prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  const expectUniqueViolation = async (promise: Promise<unknown>, field: string) => {
    const error: unknown = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect((error as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');
    expect(JSON.stringify((error as Prisma.PrismaClientKnownRequestError).meta)).toContain(field);
  };

  it('creates a user with an empty bio and timestamps by default', async () => {
    const user = await createUser(app.prisma);

    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user.bio).toBe('');
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects a duplicate email', async () => {
    await createUser(app.prisma, { email: 'ana@chirp.dev' });

    await expectUniqueViolation(createUser(app.prisma, { email: 'ana@chirp.dev' }), 'email');
  });

  it('rejects a duplicate username', async () => {
    await createUser(app.prisma, { username: 'ana' });

    await expectUniqueViolation(createUser(app.prisma, { username: 'ana' }), 'username');
  });

  it('rejects a username longer than 15 characters', async () => {
    await expect(createUser(app.prisma, { username: 'a'.repeat(16) })).rejects.toThrow();
  });

  it('rejects a duplicate session token hash', async () => {
    const user = await createUser(app.prisma);
    const session = { userId: user.id, tokenHash: 'hash', expiresAt: new Date(Date.now() + 1000) };
    await app.prisma.session.create({ data: session });

    await expectUniqueViolation(app.prisma.session.create({ data: session }), 'token_hash');
  });

  it("deletes a user's sessions when the user is deleted", async () => {
    const user = await createUser(app.prisma);
    await app.prisma.session.create({
      data: { userId: user.id, tokenHash: 'hash', expiresAt: new Date(Date.now() + 1000) },
    });

    await app.prisma.user.delete({ where: { id: user.id } });

    expect(await app.prisma.session.count()).toBe(0);
  });

  it("deletes a user's tweets when the user is deleted", async () => {
    const user = await createUser(app.prisma);
    await createTweet(app.prisma, user);

    await app.prisma.user.delete({ where: { id: user.id } });

    expect(await app.prisma.tweet.count()).toBe(0);
  });

  it('rejects tweet content longer than 280 code points', async () => {
    const user = await createUser(app.prisma);

    await expect(createTweet(app.prisma, user, { content: 'a'.repeat(281) })).rejects.toThrow();
    await expect(
      createTweet(app.prisma, user, { content: '🐦'.repeat(280) }),
    ).resolves.toBeDefined();
  });

  it('rejects a duplicate follow', async () => {
    const ana = await createUser(app.prisma);
    const bruno = await createUser(app.prisma);
    await createFollow(app.prisma, ana, bruno);

    await expectUniqueViolation(createFollow(app.prisma, ana, bruno), 'follows_pkey');
  });

  it('rejects a self-follow through the CHECK constraint', async () => {
    const ana = await createUser(app.prisma);

    await expect(createFollow(app.prisma, ana, ana)).rejects.toThrow(/follows_no_self_follow/);
  });

  it.each(['follower', 'followed user'] as const)(
    'deletes a follow when the %s is deleted',
    async (side) => {
      const ana = await createUser(app.prisma);
      const bruno = await createUser(app.prisma);
      await createFollow(app.prisma, ana, bruno);

      await app.prisma.user.delete({ where: { id: side === 'follower' ? ana.id : bruno.id } });

      expect(await app.prisma.follow.count()).toBe(0);
    },
  );

  it('rejects a duplicate like', async () => {
    const ana = await createUser(app.prisma);
    const tweet = await createTweet(app.prisma, ana);
    await createLike(app.prisma, ana, tweet);

    await expectUniqueViolation(createLike(app.prisma, ana, tweet), 'likes_pkey');
  });

  it.each(['user who liked', 'tweet'] as const)(
    'deletes a like when the %s is deleted',
    async (side) => {
      const ana = await createUser(app.prisma);
      const tweet = await createTweet(app.prisma, await createUser(app.prisma));
      await createLike(app.prisma, ana, tweet);

      if (side === 'tweet') await app.prisma.tweet.delete({ where: { id: tweet.id } });
      else await app.prisma.user.delete({ where: { id: ana.id } });

      expect(await app.prisma.like.count()).toBe(0);
    },
  );

  it('starts every test from empty tables', async () => {
    expect(await app.prisma.user.count()).toBe(0);
    expect(await app.prisma.session.count()).toBe(0);
    expect(await app.prisma.tweet.count()).toBe(0);
    expect(await app.prisma.follow.count()).toBe(0);
    expect(await app.prisma.like.count()).toBe(0);
  });
});
