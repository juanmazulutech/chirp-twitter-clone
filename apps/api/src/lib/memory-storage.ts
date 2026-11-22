import {
  type PresignUploadInput,
  publicObjectUrl,
  type PutObjectInput,
  type StorageService,
  UPLOAD_URL_TTL_SECONDS,
} from './storage';

export interface StoredObject {
  body: Uint8Array;
  contentType: string;
}

const MEMORY_ENDPOINT = 'http://storage.test';
const MEMORY_BUCKET = 'chirp-media';

/**
 * In-process storage for tests: same contract as `S3Storage`, no network. Uploads
 * "through" a presigned URL are simulated with `put`.
 */
export class MemoryStorage implements StorageService {
  readonly #objects = new Map<string, StoredObject>();

  presignUpload({ key, contentType, size }: PresignUploadInput): Promise<string> {
    const url = new URL(this.publicUrl(key));
    url.searchParams.set('content-type', contentType);
    url.searchParams.set('content-length', String(size));
    url.searchParams.set('expires-in', String(UPLOAD_URL_TTL_SECONDS));
    return Promise.resolve(url.toString());
  }

  exists(key: string): Promise<boolean> {
    return Promise.resolve(this.#objects.has(key));
  }

  put({ key, body, contentType }: PutObjectInput): Promise<void> {
    this.#objects.set(key, { body, contentType });
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.#objects.delete(key);
    return Promise.resolve();
  }

  publicUrl(key: string): string {
    return publicObjectUrl(
      { endpoint: MEMORY_ENDPOINT, bucket: MEMORY_BUCKET, forcePathStyle: true },
      key,
    );
  }

  close(): Promise<void> {
    return Promise.resolve();
  }

  /** Test inspection: the stored object, or undefined. */
  get(key: string): StoredObject | undefined {
    return this.#objects.get(key);
  }
}
