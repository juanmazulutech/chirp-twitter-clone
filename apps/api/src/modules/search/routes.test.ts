import { followListUserSchema, pageSchema } from '@chirp/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seedDatabase } from '../../../prisma/seed';
import { DEMO_USERNAME } from '../../../prisma/seed-data/users';
import { buildTestApp } from '../../../test/app';
import { loginAs } from '../../../test/auth';
import { resetDatabase } from '../../../test/database';
import { createFollow } from '../../../test/factories/follows';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';
import type { User } from '../../generated/prisma/client';
import { escapeLike } from './service';

const resultPage = pageSchema(followListUserSchema);

describe('GET /api/users/search', () => {
  let app: App;
  let viewer: User;
  let cookie: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app.prisma);
    viewer = await createUser(app.prisma, { username: 'viewer', displayName: 'Viewer' });
    cookie = await loginAs(app, viewer);
  });

  afterAll(async () => {
    await app.close();
  });

  const search = (query: Record<string, string>, session: string | undefined = cookie) =>
    app.inject({
      method: 'GET',
      url: '/api/users/search',
      query,
      headers: session ? { cookie: session } : {},
    });

  const usernames = async (query: Record<string, string>) => {
    const response = await search(query);
    expect(response.statusCode).toBe(200);
    return resultPage.parse(response.json()).items.map((user) => user.username);
  };

  const userAt = (username: string, displayName: string, minutesAgo: number) =>
    createUser(app.prisma, {
      username,
      displayName,
      createdAt: new Date(Date.now() - minutesAgo * 60_000),
    });

  it('finds people by username or display name, case-insensitively', async () => {
    await userAt('ana_codes', 'Ana Torres', 3);
    await userAt('bruno', 'Bruno Silva', 2);
    await userAt('carla', 'Carla Banana', 1);

    expect(await usernames({ q: 'ANA' })).toEqual(['ana_codes', 'carla']);
    expect(await usernames({ q: 'silva' })).toEqual(['bruno']);
  });

  it('ranks the exact username, then username prefixes, then other matches', async () => {
    await userAt('banana', 'Banana Split', 1);
    await userAt('anabel', 'Anabel', 2);
    await userAt('ana', 'Just Ana', 9);
    await userAt('zoe', 'Zoe Ana', 0);
    await userAt('ana_codes', 'Ana Torres', 3);

    expect(await usernames({ q: 'ana' })).toEqual(['ana', 'anabel', 'ana_codes', 'zoe', 'banana']);
  });

  it('drops a leading @ and surrounding spaces', async () => {
    await userAt('ana_codes', 'Ana Torres', 1);

    expect(await usernames({ q: '  @ana_c ' })).toEqual(['ana_codes']);
  });

  it('matches % and _ literally, not as wildcards', async () => {
    await userAt('abc', 'Plain', 2);
    await userAt('a_c', 'Under Score', 1);
    await userAt('pct', '100% real', 3);

    expect(await usernames({ q: 'a_c' })).toEqual(['a_c']);
    expect(await usernames({ q: '0%' })).toEqual(['pct']);
    expect(await usernames({ q: '%' })).toEqual(['pct']);
  });

  it('marks the people the viewer follows', async () => {
    const followed = await userAt('ana_one', 'Ana One', 2);
    await userAt('ana_two', 'Ana Two', 1);
    await createFollow(app.prisma, viewer, followed);

    const page = resultPage.parse((await search({ q: 'ana' })).json());

    expect(page.items.map(({ username, isFollowing }) => ({ username, isFollowing }))).toEqual([
      { username: 'ana_two', isFollowing: false },
      { username: 'ana_one', isFollowing: true },
    ]);
  });

  it('includes the viewer when they match', async () => {
    expect(await usernames({ q: 'view' })).toEqual(['viewer']);
  });

  it('returns an empty last page when nobody matches', async () => {
    expect((await search({ q: 'nobody' })).json()).toEqual({ items: [], nextCursor: null });
  });

  it('walks pages across tiers without duplicates or gaps', async () => {
    // Tier 0: "ana"; tier 1: three "ana…" usernames; tier 2: three display-name matches.
    const expected = ['ana', 'ana_3', 'ana_2', 'ana_1', 'zed_3', 'zed_2', 'zed_1'];
    await userAt('ana', 'Exact', 100);
    for (const n of [1, 2, 3]) {
      await userAt(`ana_${n}`, `Prefix ${n}`, 50 - n);
      await userAt(`zed_${n}`, `Zed Ana ${n}`, 10 - n);
    }

    for (const limit of [1, 2, 3, 4, 7]) {
      const seen: string[] = [];
      let cursor: string | null = null;
      let pages = 0;
      do {
        const query: Record<string, string> = { q: 'ana', limit: String(limit) };
        if (cursor) query.cursor = cursor;
        const page = resultPage.parse((await search(query)).json());
        seen.push(...page.items.map((user) => user.username));
        cursor = page.nextCursor;
        pages += 1;
      } while (cursor && pages < 20);

      expect(seen).toEqual(expected);
      expect(pages).toBe(Math.ceil(expected.length / limit));
    }
  });

  it('resumes in the broadest tier when the last user was deleted', async () => {
    await userAt('ana', 'Exact', 3);
    await userAt('ana_b', 'Prefix', 2);
    const gone = await userAt('ana_a', 'Prefix', 1);
    const first = resultPage.parse((await search({ q: 'ana', limit: '2' })).json());
    expect(first.items.map((user) => user.username)).toEqual(['ana', 'ana_a']);
    await app.prisma.user.delete({ where: { id: gone.id } });

    const second = resultPage.parse(
      (await search({ q: 'ana', limit: '2', cursor: first.nextCursor ?? '' })).json(),
    );

    // Never a repeat; the remaining prefix match is skipped rather than shown twice.
    expect(second.items.map((user) => user.username)).not.toContain('ana');
  });

  it.each([
    ['no term', {}],
    ['an empty term', { q: '  ' }],
    ['only an @', { q: '@' }],
    ['a term over 50 characters', { q: 'a'.repeat(51) }],
    ['a malformed cursor', { q: 'ana', cursor: 'nope' }],
    ['a limit above 50', { q: 'ana', limit: '51' }],
  ])('returns 400 for %s', async (_case, query) => {
    const response = await search(query);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('returns 401 without a session', async () => {
    expect((await search({ q: 'ana' }, '')).statusCode).toBe(401);
  });
});

describe('escapeLike', () => {
  it('escapes the LIKE wildcards and the escape character', () => {
    expect(escapeLike('a_b%c\\d')).toBe('a\\_b\\%c\\\\d');
    expect(escapeLike('plain')).toBe('plain');
  });
});

describe('GET /api/users/search on the demo data', () => {
  let app: App;

  beforeAll(async () => {
    app = await buildTestApp();
    await resetDatabase(app.prisma);
    await seedDatabase(app.prisma);
  });

  afterAll(async () => {
    await resetDatabase(app.prisma);
    await app.close();
  });

  it('finds the seed users matching "ana", the username match first', async () => {
    const demo = await app.prisma.user.findUniqueOrThrow({ where: { username: DEMO_USERNAME } });

    const response = await app.inject({
      method: 'GET',
      url: '/api/users/search',
      query: { q: 'ana' },
      headers: { cookie: await loginAs(app, demo) },
    });

    const usernames = resultPage.parse(response.json()).items.map((user) => user.username);
    expect(usernames[0]).toBe('ana_codes');
    expect(usernames.length).toBeGreaterThan(1);
  });
});
