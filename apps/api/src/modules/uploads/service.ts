import { randomUUID } from 'node:crypto';

import type {
  ImageContentType,
  PresignUploadBody,
  PresignUploadResponse,
  UploadPurpose,
} from '@chirp/shared';

import { ValidationError } from '../../lib/errors';
import type { StorageService } from '../../lib/storage';

export interface UploadsServiceDependencies {
  storage: StorageService;
  /** `UPLOAD_MAX_BYTES`: may be lower than the shared schema's limit. */
  maxBytes: number;
}

export type UploadsService = ReturnType<typeof createUploadsService>;

const EXTENSIONS: Record<ImageContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Keys are generated, never chosen by the client, and start with the owner's prefix,
 * which is how tweets and profiles later prove an uploaded image is theirs (ADR-14).
 */
export function uploadKey(userId: string, purpose: UploadPurpose, contentType: ImageContentType) {
  return `users/${userId}/${purpose}/${randomUUID()}.${EXTENSIONS[contentType]}`;
}

export function createUploadsService({ storage, maxBytes }: UploadsServiceDependencies) {
  async function presign(
    userId: string,
    { purpose, contentType, size }: PresignUploadBody,
  ): Promise<PresignUploadResponse> {
    if (size > maxBytes) {
      const message = `Use an image of at most ${formatMegabytes(maxBytes)}`;
      throw new ValidationError(message, { fieldErrors: { size: [message] } });
    }

    const key = uploadKey(userId, purpose, contentType);
    const uploadUrl = await storage.presignUpload({ key, contentType, size });
    return { uploadUrl, key };
  }

  return { presign };
}

function formatMegabytes(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
}
