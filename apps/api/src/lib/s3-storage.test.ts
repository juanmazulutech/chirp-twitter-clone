import { createServer, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { S3Storage, type S3StorageOptions } from './s3-storage';

interface RecordedRequest {
  method: string;
  path: string;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

/**
 * A minimal S3 stand-in over real HTTP: it records what the SDK sends and answers
 * HEAD/PUT/DELETE the way S3 does, so the driver is tested without the storage container.
 */
function createFakeS3() {
  const objects = new Map<string, Buffer>();
  const requests: RecordedRequest[] = [];

  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      const path = new URL(request.url ?? '/', 'http://fake').pathname;
      const body = Buffer.concat(chunks);
      requests.push({ method: request.method ?? '', path, headers: request.headers, body });

      // A 403 is not retried by the SDK, so the failure path stays fast.
      if (path.endsWith('/forbidden.png')) {
        response.writeHead(403, { 'content-type': 'application/xml' });
        response.end('<Error><Code>AccessDenied</Code><Message>denied</Message></Error>');
        return;
      }

      switch (request.method) {
        case 'HEAD':
          response.writeHead(objects.has(path) ? 200 : 404).end();
          return;
        case 'PUT':
          objects.set(path, body);
          response.writeHead(200, { etag: '"etag"' }).end();
          return;
        case 'DELETE':
          objects.delete(path);
          response.writeHead(204).end();
          return;
        default:
          response.writeHead(405).end();
      }
    });
  });

  return { server, objects, requests };
}

const fake = createFakeS3();
let options: S3StorageOptions;

beforeAll(async () => {
  await new Promise<void>((resolve) => fake.server.listen(0, '127.0.0.1', resolve));
  const { port } = fake.server.address() as AddressInfo;
  options = {
    endpoint: `http://127.0.0.1:${port}`,
    publicEndpoint: 'http://media.chirp.test:9000',
    region: 'us-east-1',
    bucket: 'chirp-media',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    forcePathStyle: true,
  };
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    fake.server.close((error) => (error ? reject(error) : resolve())),
  );
});

beforeEach(() => {
  fake.objects.clear();
  fake.requests.length = 0;
});

describe('S3Storage', () => {
  describe('presignUpload', () => {
    it('signs content type and length against the public endpoint, valid for 5 minutes', async () => {
      const storage = new S3Storage(options);

      const url = new URL(
        await storage.presignUpload({
          key: 'users/u1/tweet/a.png',
          contentType: 'image/png',
          size: 2048,
        }),
      );

      expect(url.origin).toBe('http://media.chirp.test:9000');
      expect(url.pathname).toBe('/chirp-media/users/u1/tweet/a.png');
      expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
      expect(url.searchParams.get('X-Amz-SignedHeaders')?.split(';').sort()).toEqual([
        'content-length',
        'content-type',
        'host',
      ]);
      expect(url.searchParams.get('X-Amz-Credential')).toMatch(
        /^test-key\/\d{8}\/us-east-1\/s3\/aws4_request$/,
      );
      expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
      await storage.close();
    });

    it('adds no checksum of an empty body, which S3 would reject with BadDigest', async () => {
      const storage = new S3Storage(options);

      const url = new URL(
        await storage.presignUpload({ key: 'a.png', contentType: 'image/png', size: 10 }),
      );

      const checksumParams = [...url.searchParams.keys()].filter((name) =>
        name.toLowerCase().startsWith('x-amz-checksum'),
      );
      expect(checksumParams).toEqual([]);
      expect(url.searchParams.get('x-amz-sdk-checksum-algorithm')).toBeNull();
      await storage.close();
    });

    it('signs nothing over the network', async () => {
      const storage = new S3Storage(options);
      await storage.presignUpload({ key: 'a.png', contentType: 'image/png', size: 10 });

      expect(fake.requests).toEqual([]);
      await storage.close();
    });
  });

  describe('object operations', () => {
    it('uploads an object with its content type and no checksum header', async () => {
      const storage = new S3Storage(options);

      await storage.put({
        key: 'seed/avatars/ana.svg',
        body: new TextEncoder().encode('<svg/>'),
        contentType: 'image/svg+xml',
      });

      const [request] = fake.requests;
      expect(request?.method).toBe('PUT');
      expect(request?.path).toBe('/chirp-media/seed/avatars/ana.svg');
      expect(request?.headers['content-type']).toBe('image/svg+xml');
      expect(request?.body.toString()).toBe('<svg/>');
      expect(
        Object.keys(request?.headers ?? {}).filter((h) => h.startsWith('x-amz-checksum')),
      ).toEqual([]);
      await storage.close();
    });

    it('reports whether an object exists', async () => {
      const storage = new S3Storage(options);
      fake.objects.set('/chirp-media/users/u1/tweet/a.png', Buffer.from('png'));

      expect(await storage.exists('users/u1/tweet/a.png')).toBe(true);
      expect(await storage.exists('users/u1/tweet/missing.png')).toBe(false);
      expect(fake.requests.map((request) => request.method)).toEqual(['HEAD', 'HEAD']);
      await storage.close();
    });

    it('propagates storage failures other than "not found"', async () => {
      const storage = new S3Storage(options);

      await expect(storage.exists('forbidden.png')).rejects.toMatchObject({
        $metadata: { httpStatusCode: 403 },
      });
      await storage.close();
    });

    it('deletes an object', async () => {
      const storage = new S3Storage(options);
      fake.objects.set('/chirp-media/a.png', Buffer.from('png'));

      await storage.delete('a.png');

      expect(fake.objects.has('/chirp-media/a.png')).toBe(false);
      expect(fake.requests.map((request) => request.method)).toEqual(['DELETE']);
      await storage.close();
    });
  });

  it('builds public URLs on the public endpoint', async () => {
    const storage = new S3Storage(options);

    expect(storage.publicUrl('users/u1/avatar/b.webp')).toBe(
      'http://media.chirp.test:9000/chirp-media/users/u1/avatar/b.webp',
    );
    await storage.close();
  });
});
