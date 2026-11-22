import { describe, expect, it } from 'vitest';

import { publicObjectUrl } from './storage';

describe('publicObjectUrl', () => {
  it('builds a path-style URL for local S3-compatible storage', () => {
    expect(
      publicObjectUrl(
        { endpoint: 'http://localhost:9000', bucket: 'chirp-media', forcePathStyle: true },
        'users/u1/tweet/a.png',
      ),
    ).toBe('http://localhost:9000/chirp-media/users/u1/tweet/a.png');
  });

  it('builds a virtual-hosted URL when path style is off', () => {
    expect(
      publicObjectUrl(
        { endpoint: 'https://s3.eu-west-1.amazonaws.com', bucket: 'chirp', forcePathStyle: false },
        'users/u1/avatar/b.webp',
      ),
    ).toBe('https://chirp.s3.eu-west-1.amazonaws.com/users/u1/avatar/b.webp');
  });

  it('keeps a base path on the endpoint (storage behind a reverse proxy)', () => {
    expect(
      publicObjectUrl(
        { endpoint: 'http://localhost:8080/media/', bucket: 'chirp-media', forcePathStyle: true },
        'a.png',
      ),
    ).toBe('http://localhost:8080/media/chirp-media/a.png');
  });

  it('encodes each key segment but keeps the separators', () => {
    expect(
      publicObjectUrl(
        { endpoint: 'http://localhost:9000', bucket: 'chirp-media', forcePathStyle: true },
        'seed/a b/ñ?#.svg',
      ),
    ).toBe('http://localhost:9000/chirp-media/seed/a%20b/%C3%B1%3F%23.svg');
  });
});
