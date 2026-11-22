import type { PresignUploadBody } from '@chirp/shared';
import { http, HttpResponse } from 'msw';

import { server } from './server';

/** The bucket's CORS answer for the web origin, as `storage-init` configures it. */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT',
  'Access-Control-Allow-Headers': 'content-type',
};

interface StorageOptions {
  /** The key the presign answers with; the upload URL is derived from it. */
  key: string;
  onPresign?: (body: PresignUploadBody) => void;
  /** Answers the PUT; delay or fail it here. */
  put?: () => Response | Promise<Response>;
}

/** A storage answer that keeps the CORS headers the browser requires. */
export function storageResponse(status: number): Response {
  return new HttpResponse(null, { status, headers: CORS_HEADERS });
}

/**
 * Presign and the bucket as they behave for real. jsdom enforces CORS on the cross-origin
 * PUT, so the bucket also answers the preflight. Returns the upload URL.
 */
export function storageAccepts({
  key,
  onPresign = () => {},
  put = () => storageResponse(200),
}: StorageOptions): string {
  const uploadUrl = `http://storage.test/chirp-media/${key}`;
  server.use(
    http.post('/api/uploads/presign', async ({ request }) => {
      onPresign((await request.json()) as PresignUploadBody);
      return HttpResponse.json({ uploadUrl, key });
    }),
    http.options(uploadUrl, () => new HttpResponse(null, { status: 204, headers: CORS_HEADERS })),
    http.put(uploadUrl, put),
  );
  return uploadUrl;
}

/** A small image file the shared limits accept. */
export function pngFile(bytes = 8, name = 'photo.png'): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' });
}
