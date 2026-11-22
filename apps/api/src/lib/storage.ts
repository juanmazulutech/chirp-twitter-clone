/** How long a presigned upload URL stays valid (ADR-14). */
export const UPLOAD_URL_TTL_SECONDS = 5 * 60;

export interface PresignUploadInput {
  key: string;
  contentType: string;
  /** Exact size in bytes; the signature only accepts an upload of this length. */
  size: number;
}

export interface PutObjectInput {
  key: string;
  body: Uint8Array;
  contentType: string;
}

/**
 * Object storage as the API sees it. Services depend on this interface, never on
 * the S3 SDK, so tests run against `MemoryStorage` without the storage container.
 */
export interface StorageService {
  /** A URL the browser can `PUT` the object to, signed for this exact type and size. */
  presignUpload(input: PresignUploadInput): Promise<string>;
  exists(key: string): Promise<boolean>;
  put(input: PutObjectInput): Promise<void>;
  /** Deleting a missing object succeeds, so callers can delete best-effort. */
  delete(key: string): Promise<void>;
  /** The anonymous-read URL the browser loads the object from. */
  publicUrl(key: string): string;
  close(): Promise<void>;
}

export interface PublicUrlOptions {
  endpoint: string;
  bucket: string;
  /** `http://host/bucket/key` instead of `http://bucket.host/key`. */
  forcePathStyle: boolean;
}

/** Builds the public URL of an object, encoding each key segment. */
export function publicObjectUrl(
  { endpoint, bucket, forcePathStyle }: PublicUrlOptions,
  key: string,
): string {
  const url = new URL(endpoint);
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  const basePath = url.pathname.replace(/\/+$/, '');

  if (forcePathStyle) {
    url.pathname = `${basePath}/${encodeURIComponent(bucket)}/${encodedKey}`;
  } else {
    url.hostname = `${bucket}.${url.hostname}`;
    url.pathname = `${basePath}/${encodedKey}`;
  }
  return url.toString();
}
