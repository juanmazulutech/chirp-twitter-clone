import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import {
  type PresignUploadInput,
  publicObjectUrl,
  type PutObjectInput,
  type StorageService,
  UPLOAD_URL_TTL_SECONDS,
} from './storage';

export interface S3StorageOptions {
  /** Where the API reaches the storage (inside Docker: http://storage:9000). */
  endpoint: string;
  /** Where the browser reaches it; presigned and public URLs use this host. */
  publicEndpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

// Without these, a presigned URL signs only `host` and accepts any type and size (ADR-14).
const SIGNED_UPLOAD_HEADERS = new Set(['content-type', 'content-length']);

/** Storage on S3 or any S3-compatible server (RustFS locally), chosen by configuration only. */
export class S3Storage implements StorageService {
  readonly #bucket: string;
  readonly #publicUrlOptions: Parameters<typeof publicObjectUrl>[0];
  readonly #client: S3Client;
  // A signature covers the host, so URLs for the browser are signed against the public endpoint.
  readonly #presignClient: S3Client;

  constructor(options: S3StorageOptions) {
    const shared: S3ClientConfig = {
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      forcePathStyle: options.forcePathStyle,
      // Recent SDKs add a CRC32 of an empty body to presigned URLs, which S3 and
      // checksum-validating servers reject with BadDigest (ADR-14).
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    };

    this.#bucket = options.bucket;
    this.#publicUrlOptions = {
      endpoint: options.publicEndpoint,
      bucket: options.bucket,
      forcePathStyle: options.forcePathStyle,
    };
    this.#client = new S3Client({ ...shared, endpoint: options.endpoint });
    this.#presignClient = new S3Client({ ...shared, endpoint: options.publicEndpoint });
  }

  presignUpload({ key, contentType, size }: PresignUploadInput): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.#bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    });
    return getSignedUrl(this.#presignClient, command, {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      signableHeaders: SIGNED_UPLOAD_HEADERS,
    });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.#client.send(new HeadObjectCommand({ Bucket: this.#bucket, Key: key }));
      return true;
    } catch (error) {
      if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async put({ key, body, contentType }: PutObjectInput): Promise<void> {
    await this.#client.send(
      new PutObjectCommand({
        Bucket: this.#bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.#client.send(new DeleteObjectCommand({ Bucket: this.#bucket, Key: key }));
  }

  publicUrl(key: string): string {
    return publicObjectUrl(this.#publicUrlOptions, key);
  }

  close(): Promise<void> {
    this.#client.destroy();
    this.#presignClient.destroy();
    return Promise.resolve();
  }
}
