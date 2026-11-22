import { describe, expect, it } from 'vitest';

import { MemoryStorage } from './memory-storage';

const object = {
  key: 'users/u1/tweet/a.png',
  body: new Uint8Array([1, 2, 3]),
  contentType: 'image/png',
};

describe('MemoryStorage', () => {
  it('stores, finds and deletes objects', async () => {
    const storage = new MemoryStorage();
    expect(await storage.exists(object.key)).toBe(false);

    await storage.put(object);
    expect(await storage.exists(object.key)).toBe(true);
    expect(storage.get(object.key)).toEqual({ body: object.body, contentType: 'image/png' });

    await storage.delete(object.key);
    expect(await storage.exists(object.key)).toBe(false);
    expect(storage.get(object.key)).toBeUndefined();
  });

  it('deletes a missing object without failing', async () => {
    await expect(new MemoryStorage().delete('missing.png')).resolves.toBeUndefined();
  });

  it('returns a presigned URL carrying the signed type, size and lifetime', async () => {
    const url = new URL(
      await new MemoryStorage().presignUpload({
        key: object.key,
        contentType: 'image/png',
        size: 1024,
      }),
    );

    expect(`${url.origin}${url.pathname}`).toBe(
      'http://storage.test/chirp-media/users/u1/tweet/a.png',
    );
    expect(url.searchParams.get('content-type')).toBe('image/png');
    expect(url.searchParams.get('content-length')).toBe('1024');
    expect(url.searchParams.get('expires-in')).toBe('300');
  });

  it('keeps each instance isolated', async () => {
    const first = new MemoryStorage();
    await first.put(object);

    expect(await new MemoryStorage().exists(object.key)).toBe(false);
    await expect(first.close()).resolves.toBeUndefined();
  });
});
