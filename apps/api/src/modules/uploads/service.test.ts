import { describe, expect, it, vi } from 'vitest';

import { ValidationError } from '../../lib/errors';
import { MemoryStorage } from '../../lib/memory-storage';
import { createUploadsService, uploadKey } from './service';

const USER_ID = '0190a7e4-0000-7000-8000-000000000001';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

describe('uploadKey', () => {
  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
    ['image/gif', 'gif'],
  ] as const)('names a %s upload with the .%s extension under the owner prefix', (type, ext) => {
    expect(uploadKey(USER_ID, 'tweet', type)).toMatch(
      new RegExp(`^users/${USER_ID}/tweet/${UUID}\\.${ext}$`),
    );
  });

  it('generates a different key every time', () => {
    expect(uploadKey(USER_ID, 'avatar', 'image/png')).not.toBe(
      uploadKey(USER_ID, 'avatar', 'image/png'),
    );
  });
});

describe('uploads service', () => {
  it('presigns the generated key for the declared type and size', async () => {
    const storage = new MemoryStorage();
    const presignUpload = vi.spyOn(storage, 'presignUpload');
    const uploads = createUploadsService({ storage, maxBytes: 1024 });

    const result = await uploads.presign(USER_ID, {
      purpose: 'avatar',
      contentType: 'image/webp',
      size: 1024,
    });

    expect(result.key).toMatch(new RegExp(`^users/${USER_ID}/avatar/${UUID}\\.webp$`));
    expect(presignUpload).toHaveBeenCalledWith({
      key: result.key,
      contentType: 'image/webp',
      size: 1024,
    });
    expect(result.uploadUrl).toContain(result.key);
  });

  it('rejects an image above the configured limit, on the size field', async () => {
    const storage = new MemoryStorage();
    const presignUpload = vi.spyOn(storage, 'presignUpload');
    const uploads = createUploadsService({ storage, maxBytes: 1.5 * 1024 * 1024 });

    const presign = uploads.presign(USER_ID, {
      purpose: 'tweet',
      contentType: 'image/png',
      size: 1.5 * 1024 * 1024 + 1,
    });

    await expect(presign).rejects.toThrow(ValidationError);
    await expect(presign).rejects.toMatchObject({
      fieldErrors: { size: ['Use an image of at most 1.5 MB'] },
    });
    expect(presignUpload).not.toHaveBeenCalled();
  });
});
