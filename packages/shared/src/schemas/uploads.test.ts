import { describe, expect, it } from 'vitest';

import { IMAGE_MAX_BYTES } from '../constants';
import { presignUploadBodySchema, presignUploadResponseSchema } from './uploads';

const valid = { purpose: 'tweet', contentType: 'image/png', size: 1024 };

describe('presignUploadBodySchema', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])('accepts %s', (contentType) => {
    expect(presignUploadBodySchema.parse({ ...valid, contentType })).toEqual({
      ...valid,
      contentType,
    });
  });

  it.each(['tweet', 'avatar'])('accepts the %s purpose', (purpose) => {
    expect(presignUploadBodySchema.safeParse({ ...valid, purpose }).success).toBe(true);
  });

  it.each(['image/svg+xml', 'text/html', 'application/octet-stream', 'IMAGE/PNG'])(
    'rejects the content type %s',
    (contentType) => {
      const result = presignUploadBodySchema.safeParse({ ...valid, contentType });
      expect(result.error?.issues[0]?.message).toBe('Use a JPEG, PNG, WebP or GIF image');
    },
  );

  it('rejects an unknown purpose', () => {
    expect(presignUploadBodySchema.safeParse({ ...valid, purpose: 'banner' }).success).toBe(false);
  });

  it('accepts exactly the maximum size and rejects one byte more', () => {
    expect(presignUploadBodySchema.safeParse({ ...valid, size: IMAGE_MAX_BYTES }).success).toBe(
      true,
    );
    const result = presignUploadBodySchema.safeParse({ ...valid, size: IMAGE_MAX_BYTES + 1 });
    expect(result.error?.issues[0]?.message).toBe('Use an image of at most 5 MB');
  });

  it.each([0, -1, 1.5, '1024'])('rejects the size %j', (size) => {
    expect(presignUploadBodySchema.safeParse({ ...valid, size }).success).toBe(false);
  });
});

describe('presignUploadResponseSchema', () => {
  it('requires an upload URL and a key', () => {
    expect(
      presignUploadResponseSchema.safeParse({ uploadUrl: 'http://s/b/k?sig=1', key: 'k' }).success,
    ).toBe(true);
    expect(
      presignUploadResponseSchema.safeParse({ uploadUrl: 'not a url', key: 'k' }).success,
    ).toBe(false);
    expect(
      presignUploadResponseSchema.safeParse({ uploadUrl: 'http://s/b/k', key: '' }).success,
    ).toBe(false);
  });
});
