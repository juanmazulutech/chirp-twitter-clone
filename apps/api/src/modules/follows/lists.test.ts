import { followListUserSchema, pageSchema } from '@chirp/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { loginAs } from '../../../test/auth';
import { resetDatabase } from '../../../test/database';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';
import type { User } from '../../generated/prisma/client';

const listPage = pageSchema(followListUserSchema);

describe.each(['followers', 'following'] as const)('GET /api/users/:username/%s', (list) => {
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

  const getList = (username: string, cookie?: string, query: Record<string, string> = {}) =>
    app.inject({
      method: 'GET',
      url: `/api/users/${username}/${list}`,
      query,
      headers: cookie ? { cookie } : {},
    });

  const fetchPage = async (
    username: string,
    cookie: string,
    query: Record<string, string> = {},
  ) => {
    const response = await getList(username, cookie, query);
    expect(response.statusCode).toBe(200);
    return listPage.parse(response.json());
  };

  /**
   * Connects `subject` with `other` in the direction this list shows: `other` follows the
   * subject for `followers`, the subject follows `other` for `following`.
   */
  const connect = (subject: Pick<User, 'id'>, other: Pick<User, 'id'>, at = new Date()) =>
    app.prisma.follow.create({
      data:
        list === 'followers'
          ? { followerId: other.id, followingId: subject.id, createdAt: at }
          : { followerId: subject.id, followingId: other.id, createdAt: at },
    });

  /** The reverse direction, which must never show up in this list. */
  const connectReversed = (subject: Pick<User, 'id'>, other: Pick<User, 'id'>) =>
    app.prisma.follow.create({
      data:
        list === 'followers'
          ? { followerId: subject.id, followingId: other.id }
          : { followerId: other.id, followingId: subject.id },
    });

  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

  it('lists the users, most recent follow first, with only summary fields', async () => {
    const ana = await createUser(app.prisma, { username: 'ana' });
    const older = await createUser(app.prisma, { username: 'older', displayName: 'Older' });
    const newer = await createUser(app.prisma, { username: 'newer', displayName: 'Newer' });
    await connect(ana, older, minutesAgo(10));
    await connect(ana, newer, minutesAgo(1));

    const page = await fetchPage('ana', await loginAs(app, await createUser(app.prisma)));

    expect(page).toEqual({
      items: [
        {
          id: newer.id,
          username: 'newer',
          displayName: 'Newer',
          avatarUrl: null,
          isFollowing: false,
        },
        {
          id: older.id,
          username: 'older',
          displayName: 'Older',
          avatarUrl: null,
          isFollowing: false,
        },
      ],
      nextCursor: null,
    });
  });

  it('never lists the other direction', async () => {
    const ana = await createUser(app.prisma, { username: 'ana' });
    await connectReversed(ana, await createUser(app.prisma));

    expect((await fetchPage('ana', await loginAs(app, ana))).items).toEqual([]);
  });

  it('marks the users the viewer follows, whoever the list belongs to', async () => {
    const viewer = await createUser(app.prisma);
    const ana = await createUser(app.prisma, { username: 'ana' });
    const followed = await createUser(app.prisma);
    const notFollowed = await createUser(app.prisma);
    await connect(ana, followed, minutesAgo(2));
    await connect(ana, notFollowed, minutesAgo(1));
    await app.prisma.follow.create({ data: { followerId: viewer.id, followingId: followed.id } });

    const page = await fetchPage('ana', await loginAs(app, viewer));

    expect(page.items.map(({ id, isFollowing }) => ({ id, isFollowing }))).toEqual([
      { id: notFollowed.id, isFollowing: false },
      { id: followed.id, isFollowing: true },
    ]);
  });

  it('walks every page without duplicates or gaps, breaking timestamp ties by user', async () => {
    const ana = await createUser(app.prisma, { username: 'ana' });
    const sameMoment = minutesAgo(5);
    const others: User[] = [];
    for (let i = 0; i < 5; i += 1) {
      const other = await createUser(app.prisma);
      others.push(other);
      // Three follows share a timestamp, so pages must split them by id.
      await connect(ana, other, i < 3 ? sameMoment : minutesAgo(10 + i));
    }
    const cookie = await loginAs(app, ana);

    const ids: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = await fetchPage('ana', cookie, { limit: '2', ...(cursor ? { cursor } : {}) });
      ids.push(...page.items.map((user) => user.id));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor && pages < 10);

    expect(pages).toBe(3);
    expect([...ids].sort()).toEqual(others.map((user) => user.id).sort());
    expect(new Set(ids).size).toBe(5);
  });

  it('returns an empty last page for a user with nobody in the list', async () => {
    const ana = await createUser(app.prisma, { username: 'ana' });

    expect(await fetchPage('ana', await loginAs(app, ana))).toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it('returns 404 for an unknown user', async () => {
    const response = await getList('ghost', await loginAs(app, await createUser(app.prisma)));

    expect(response.statusCode).toBe(404);
  });

  it.each([
    ['a malformed cursor', { cursor: 'not-a-cursor' }],
    ['a limit of 0', { limit: '0' }],
  ])('returns 400 for %s', async (_case, query) => {
    await createUser(app.prisma, { username: 'ana' });

    const response = await getList('ana', await loginAs(app, await createUser(app.prisma)), query);

    expect(response.statusCode).toBe(400);
  });

  it('returns 401 without a session', async () => {
    await createUser(app.prisma, { username: 'ana' });

    expect((await getList('ana')).statusCode).toBe(401);
  });
});
