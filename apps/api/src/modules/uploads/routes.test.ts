import { IMAGE_MAX_BYTES, presignUploadResponseSchema } from '@chirp/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp } from '../../../test/app';
import { loginAs } from '../../../test/auth';
import { resetDatabase } from '../../../test/database';
import { createUser } from '../../../test/factories/users';
import type { App } from '../../app';

describe('uploads routes', () => {
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

  const valid = { purpose: 'tweet', contentType: 'image/png', size: 2048 };

  const presign = (payload: unknown, headers: Record<string, string> = {}) =>
    app.inject({
      method: 'POST',
      url: '/api/uploads/presign',
      payload: payload as object,
      headers,
    });

  const signedIn = async () => {
    const user = await createUser(app.prisma);
    return { user, cookie: await loginAs(app, user) };
  };

  const errorOf = (body: unknown) =>
    (body as { error: { code: string; details?: { fieldErrors: Record<string, string[]> } } })
      .error;

  describe('POST /api/uploads/presign', () => {
    it('returns a presigned URL for a key under the user prefix', async () => {
      const { user, cookie } = await signedIn();

      const response = await presign(valid, { cookie });

      expect(response.statusCode).toBe(200);
      const { uploadUrl, key } = presignUploadResponseSchema.parse(response.json());
      expect(key).toMatch(new RegExp(`^users/${user.id}/tweet/[0-9a-f-]{36}\\.png$`));
      const url = new URL(uploadUrl);
      expect(url.pathname).toBe(`/chirp-media/${key}`);
      expect(url.searchParams.get('content-type')).toBe('image/png');
      expect(url.searchParams.get('content-length')).toBe('2048');
    });

    it('files avatars under their own purpose', async () => {
      const { user, cookie } = await signedIn();

      const response = await presign(
        { purpose: 'avatar', contentType: 'image/jpeg', size: 10 },
        { cookie },
      );

      expect(presignUploadResponseSchema.parse(response.json()).key).toMatch(
        new RegExp(`^users/${user.id}/avatar/[0-9a-f-]{36}\\.jpg$`),
      );
    });

    it('ignores a key chosen by the client', async () => {
      const { user, cookie } = await signedIn();

      const response = await presign(
        { ...valid, key: 'users/someone-else/tweet/x.png' },
        { cookie },
      );

      expect(response.statusCode).toBe(200);
      expect(presignUploadResponseSchema.parse(response.json()).key).toMatch(
        new RegExp(`^users/${user.id}/`),
      );
    });

    it('accepts exactly the maximum size', async () => {
      const { cookie } = await signedIn();

      const response = await presign({ ...valid, size: IMAGE_MAX_BYTES }, { cookie });

      expect(response.statusCode).toBe(200);
    });

    it('requires a session', async () => {
      const response = await presign(valid);

      expect(response.statusCode).toBe(401);
      expect(errorOf(response.json()).code).toBe('UNAUTHENTICATED');
    });

    it('rejects SVG and other non-image types', async () => {
      const { cookie } = await signedIn();

      for (const contentType of ['image/svg+xml', 'text/html']) {
        const response = await presign({ ...valid, contentType }, { cookie });

        expect(response.statusCode).toBe(400);
        expect(errorOf(response.json()).details?.fieldErrors.contentType).toEqual([
          'Use a JPEG, PNG, WebP or GIF image',
        ]);
      }
    });

    it('rejects an image above 5 MB or an empty one', async () => {
      const { cookie } = await signedIn();

      const tooLarge = await presign({ ...valid, size: IMAGE_MAX_BYTES + 1 }, { cookie });
      const empty = await presign({ ...valid, size: 0 }, { cookie });

      expect(tooLarge.statusCode).toBe(400);
      expect(errorOf(tooLarge.json()).details?.fieldErrors.size).toEqual([
        'Use an image of at most 5 MB',
      ]);
      expect(empty.statusCode).toBe(400);
      expect(errorOf(empty.json()).details?.fieldErrors.size).toEqual(['The image is empty']);
    });

    it('rejects an unknown purpose or a missing field', async () => {
      const { cookie } = await signedIn();

      const unknownPurpose = await presign({ ...valid, purpose: 'banner' }, { cookie });
      const missingSize = await presign({ purpose: 'tweet', contentType: 'image/png' }, { cookie });

      expect(unknownPurpose.statusCode).toBe(400);
      expect(errorOf(unknownPurpose.json()).details?.fieldErrors).toHaveProperty('purpose');
      expect(missingSize.statusCode).toBe(400);
      expect(errorOf(missingSize.json()).details?.fieldErrors).toHaveProperty('size');
    });

    it('rejects a request from a foreign origin', async () => {
      const { cookie } = await signedIn();

      const response = await presign(valid, { cookie, origin: 'https://evil.example' });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('with a lower UPLOAD_MAX_BYTES', () => {
    let limitedApp: App;

    beforeAll(async () => {
      limitedApp = await buildTestApp({ UPLOAD_MAX_BYTES: 1024 * 1024 });
    });

    afterAll(async () => {
      await limitedApp.close();
    });

    it('enforces the configured limit', async () => {
      const user = await createUser(limitedApp.prisma);
      const cookie = await loginAs(limitedApp, user);

      const response = await limitedApp.inject({
        method: 'POST',
        url: '/api/uploads/presign',
        payload: { ...valid, size: 1024 * 1024 + 1 },
        headers: { cookie },
      });

      expect(response.statusCode).toBe(400);
      expect(errorOf(response.json()).details?.fieldErrors.size).toEqual([
        'Use an image of at most 1 MB',
      ]);
    });
  });
});
