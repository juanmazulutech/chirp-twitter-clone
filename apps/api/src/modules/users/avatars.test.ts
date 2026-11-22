import {
  followListUserSchema,
  pageSchema,
  sessionResponseSchema,
  tweetSchema,
  userProfileSchema,
} from '@chirp/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { loginAs } from '../../../test/auth';
import { resetDatabase } from '../../../test/database';
import { createFollow } from '../../../test/factories/follows';
import { createTweet } from '../../../test/factories/tweets';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';
import type { User } from '../../generated/prisma/client';
import { MemoryStorage } from '../../lib/memory-storage';
import type { StorageService } from '../../lib/storage';
import { createUsersService } from './service';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

describe('profile pictures', () => {
  let app: App;
  let storage: MemoryStorage;
  let ana: User;
  let cookie: string;

  beforeAll(async () => {
    storage = new MemoryStorage();
    app = await buildTestApp({}, { storage });
  });

  beforeEach(async () => {
    await resetDatabase(app.prisma);
    ana = await createUser(app.prisma, { username: 'ana' });
    cookie = await loginAs(app, ana);
  });

  afterAll(async () => {
    await app.close();
  });

  let sequence = 0;
  const uploaded = async (owner: Pick<User, 'id'>, purpose: 'tweet' | 'avatar' = 'avatar') => {
    sequence += 1;
    const key = `users/${owner.id}/${purpose}/picture-${sequence}.png`;
    await storage.put({ key, body: PNG, contentType: 'image/png' });
    return key;
  };

  const patchMe = (payload: object) =>
    app.inject({ method: 'PATCH', url: '/api/users/me', payload, headers: { cookie } });
  const get = (url: string, session = cookie) =>
    app.inject({ method: 'GET', url, headers: { cookie: session } });

  const expectUnusable = (response: Awaited<ReturnType<typeof patchMe>>) => {
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        details: { fieldErrors: { avatarKey: ['This picture can’t be used. Upload it again.'] } },
      },
    });
  };

  it('sets the picture and returns its public URL', async () => {
    const key = await uploaded(ana);

    const response = await patchMe({ avatarKey: key });

    expect(response.statusCode).toBe(200);
    expect(userProfileSchema.parse(response.json()).avatarUrl).toBe(storage.publicUrl(key));
    expect((await app.prisma.user.findUniqueOrThrow({ where: { id: ana.id } })).avatarKey).toBe(
      key,
    );
  });

  it('shows the picture everywhere the user appears', async () => {
    const key = await uploaded(ana);
    await patchMe({ avatarKey: key });
    const url = storage.publicUrl(key);
    await createTweet(app.prisma, ana);
    const bruno = await createUser(app.prisma, { username: 'bruno' });
    await createFollow(app.prisma, ana, bruno);
    const brunoCookie = await loginAs(app, bruno);

    expect(sessionResponseSchema.parse((await get('/api/auth/me')).json()).user.avatarUrl).toBe(
      url,
    );
    expect(
      userProfileSchema.parse((await get('/api/users/ana', brunoCookie)).json()).avatarUrl,
    ).toBe(url);
    const chirps = pageSchema(tweetSchema).parse((await get('/api/users/ana/tweets')).json());
    expect(chirps.items[0]?.author.avatarUrl).toBe(url);
    const userPage = pageSchema(followListUserSchema);
    const followers = userPage.parse((await get('/api/users/bruno/followers')).json());
    expect(followers.items[0]?.avatarUrl).toBe(url);
    const results = userPage.parse((await get('/api/users/search?q=ana')).json());
    expect(results.items.find((user) => user.username === 'ana')?.avatarUrl).toBe(url);
  });

  it('signs in with the picture in the answer', async () => {
    const key = await uploaded(ana);
    await patchMe({ avatarKey: key });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: ana.email, password: 'Password123!' },
    });

    expect(response.json()).toMatchObject({ user: { avatarUrl: storage.publicUrl(key) } });
  });

  it('replaces a picture and deletes the old one', async () => {
    const first = await uploaded(ana);
    const second = await uploaded(ana);
    await patchMe({ avatarKey: first });

    const response = await patchMe({ avatarKey: second });

    expect(response.json()).toMatchObject({ avatarUrl: storage.publicUrl(second) });
    expect(storage.get(first)).toBeUndefined();
    expect(storage.get(second)).toBeDefined();
  });

  it('removes the picture with null and deletes it', async () => {
    const key = await uploaded(ana);
    await patchMe({ avatarKey: key });

    const response = await patchMe({ avatarKey: null });

    expect(response.json()).toMatchObject({ avatarUrl: null });
    expect(storage.get(key)).toBeUndefined();
  });

  it('keeps the picture when the edit does not mention it', async () => {
    const key = await uploaded(ana);
    await patchMe({ avatarKey: key });

    const response = await patchMe({ bio: 'New bio' });

    expect(response.json()).toMatchObject({ avatarUrl: storage.publicUrl(key), bio: 'New bio' });
    expect(storage.get(key)).toBeDefined();
  });

  it('keeps the picture when the same one is sent again', async () => {
    const key = await uploaded(ana);
    await patchMe({ avatarKey: key });

    await patchMe({ avatarKey: key });

    expect(storage.get(key)).toBeDefined();
  });

  it('rejects someone else’s upload', async () => {
    expectUnusable(await patchMe({ avatarKey: await uploaded(await createUser(app.prisma)) }));
  });

  it('rejects a chirp image as a picture', async () => {
    expectUnusable(await patchMe({ avatarKey: await uploaded(ana, 'tweet') }));
  });

  it('rejects a key that was never uploaded, changing nothing', async () => {
    const response = await patchMe({
      bio: 'Changed',
      avatarKey: `users/${ana.id}/avatar/none.png`,
    });

    expectUnusable(response);
    expect((await app.prisma.user.findUniqueOrThrow({ where: { id: ana.id } })).bio).toBe('');
  });

  it('saves the profile even when the old picture cannot be deleted, and logs it', async () => {
    const old = await uploaded(ana);
    await app.prisma.user.update({ where: { id: ana.id }, data: { avatarKey: old } });
    const warnings: unknown[] = [];
    const failingStorage: StorageService = {
      presignUpload: (input) => storage.presignUpload(input),
      exists: (key) => storage.exists(key),
      put: (input) => storage.put(input),
      publicUrl: (key) => storage.publicUrl(key),
      close: () => storage.close(),
      delete: () => Promise.reject(new Error('storage is down')),
    };
    const users = createUsersService({
      prisma: app.prisma,
      storage: failingStorage,
      log: { warn: (...args: unknown[]) => warnings.push(args) },
    });

    const profile = await users.updateProfile(ana.id, { avatarKey: null });

    expect(profile.avatarUrl).toBeNull();
    expect(warnings).toHaveLength(1);
  });
});
