import { pageSchema, tweetSchema } from '@chirp/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { loginAs } from '../../../test/auth';
import { resetDatabase } from '../../../test/database';
import { createFollow } from '../../../test/factories/follows';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';
import type { User } from '../../generated/prisma/client';
import { MemoryStorage } from '../../lib/memory-storage';
import type { StorageService } from '../../lib/storage';
import { createTweetsService } from './service';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

describe('chirp images', () => {
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
  /** An object uploaded under `owner`'s prefix, as a presigned PUT would leave it. */
  const uploaded = async (owner: Pick<User, 'id'>, purpose: 'tweet' | 'avatar' = 'tweet') => {
    sequence += 1;
    const key = `users/${owner.id}/${purpose}/image-${sequence}.png`;
    await storage.put({ key, body: PNG, contentType: 'image/png' });
    return key;
  };

  const postTweet = (payload: object, session = cookie) =>
    app.inject({ method: 'POST', url: '/api/tweets', payload, headers: { cookie: session } });

  const expectUnusable = (response: Awaited<ReturnType<typeof postTweet>>) => {
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        details: { fieldErrors: { imageKey: ['This image can’t be used. Upload it again.'] } },
      },
    });
  };

  it('attaches the author’s upload and returns its public URL', async () => {
    const key = await uploaded(ana);

    const response = await postTweet({ content: 'Look at this', imageKey: key });

    expect(response.statusCode).toBe(201);
    const tweet = tweetSchema.parse(response.json());
    expect(tweet.imageUrl).toBe(storage.publicUrl(key));
    expect(await app.prisma.tweet.findUniqueOrThrow({ where: { id: tweet.id } })).toMatchObject({
      imageKey: key,
    });
  });

  it('still requires the text of the chirp', async () => {
    const key = await uploaded(ana);

    const response = await postTweet({ content: '  ', imageKey: key });

    expect(response.statusCode).toBe(400);
    expect(await app.prisma.tweet.count()).toBe(0);
  });

  it('rejects someone else’s upload', async () => {
    const key = await uploaded(await createUser(app.prisma));

    expectUnusable(await postTweet({ content: 'Not mine', imageKey: key }));
    expect(await app.prisma.tweet.count()).toBe(0);
  });

  it('rejects an avatar upload', async () => {
    expectUnusable(
      await postTweet({ content: 'Wrong kind', imageKey: await uploaded(ana, 'avatar') }),
    );
  });

  it('rejects a key that was never uploaded', async () => {
    expectUnusable(
      await postTweet({ content: 'Nothing there', imageKey: `users/${ana.id}/tweet/missing.png` }),
    );
  });

  it('rejects a key that only looks like the author’s prefix', async () => {
    // `users/{id}/tweet/…` must be a path prefix, not a string prefix of another user's id.
    expectUnusable(
      await postTweet({ content: 'Sneaky', imageKey: `users/${ana.id}x/tweet/a.png` }),
    );
  });

  it('rejects an image already attached to another chirp', async () => {
    const key = await uploaded(ana);
    expect((await postTweet({ content: 'First', imageKey: key })).statusCode).toBe(201);

    expectUnusable(await postTweet({ content: 'Second', imageKey: key }));
    expect(await app.prisma.tweet.count()).toBe(1);
  });

  it.each([
    ['empty', ''],
    ['over 255 characters', 'k'.repeat(256)],
  ])('returns 400 for an image key that is %s', async (_case, imageKey) => {
    expect((await postTweet({ content: 'Hi', imageKey })).statusCode).toBe(400);
  });

  it('shows the image wherever the chirp appears', async () => {
    const key = await uploaded(ana);
    const created = tweetSchema.parse((await postTweet({ content: 'Pic', imageKey: key })).json());
    const bruno = await createUser(app.prisma);
    await createFollow(app.prisma, bruno, ana);
    const brunoCookie = await loginAs(app, bruno);
    const get = (url: string) =>
      app.inject({ method: 'GET', url, headers: { cookie: brunoCookie } });
    const url = storage.publicUrl(key);

    expect(tweetSchema.parse((await get(`/api/tweets/${created.id}`)).json()).imageUrl).toBe(url);
    const timeline = pageSchema(tweetSchema).parse((await get('/api/timeline')).json());
    expect(timeline.items[0]?.imageUrl).toBe(url);
    const profile = pageSchema(tweetSchema).parse((await get('/api/users/ana/tweets')).json());
    expect(profile.items[0]?.imageUrl).toBe(url);
  });

  it('leaves imageUrl null on a chirp without an image', async () => {
    const response = await postTweet({ content: 'Just words' });

    expect(tweetSchema.parse(response.json()).imageUrl).toBeNull();
  });

  it('deletes the image with its chirp', async () => {
    const key = await uploaded(ana);
    const created = tweetSchema.parse((await postTweet({ content: 'Bye', imageKey: key })).json());

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/tweets/${created.id}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(204);
    expect(storage.get(key)).toBeUndefined();
  });

  it('keeps an image when someone else’s delete is refused', async () => {
    const key = await uploaded(ana);
    const created = tweetSchema.parse((await postTweet({ content: 'Mine', imageKey: key })).json());

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/tweets/${created.id}`,
      headers: { cookie: await loginAs(app, await createUser(app.prisma)) },
    });

    expect(response.statusCode).toBe(403);
    expect(storage.get(key)).toBeDefined();
  });

  it('deletes the chirp even when the image cannot be deleted, and logs it', async () => {
    const key = await uploaded(ana);
    const tweet = await app.prisma.tweet.create({
      data: { authorId: ana.id, content: 'Stuck image', imageKey: key },
    });
    const warnings: unknown[] = [];
    const failingStorage: StorageService = {
      presignUpload: (input) => storage.presignUpload(input),
      exists: (k) => storage.exists(k),
      put: (input) => storage.put(input),
      publicUrl: (k) => storage.publicUrl(k),
      close: () => storage.close(),
      delete: () => Promise.reject(new Error('storage is down')),
    };
    const tweets = createTweetsService({
      prisma: app.prisma,
      storage: failingStorage,
      log: { warn: (...args: unknown[]) => warnings.push(args) },
    });

    await tweets.remove(tweet.id, ana.id);

    expect(await app.prisma.tweet.count()).toBe(0);
    expect(warnings).toHaveLength(1);
    expect(storage.get(key)).toBeDefined();
  });
});
