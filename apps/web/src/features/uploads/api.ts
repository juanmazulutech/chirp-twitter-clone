import {
  type PresignUploadBody,
  type PresignUploadResponse,
  presignUploadResponseSchema,
} from '@chirp/shared';

import { apiRequest } from '@/lib/api-client';

/** Asks the API for a one-time URL to upload one image of this type and size (ADR-14). */
export function presignUpload(body: PresignUploadBody): Promise<PresignUploadResponse> {
  return apiRequest('/uploads/presign', {
    method: 'POST',
    body,
    schema: presignUploadResponseSchema,
  });
}

interface PutFileOptions {
  /** Called with the fraction sent so far, from 0 to 1. */
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}

/**
 * Sends the file straight to storage with the presigned URL. XMLHttpRequest, not fetch:
 * only it reports upload progress. The browser sets Content-Length from the file, which
 * must match the size the URL was signed for.
 */
export function putFile(
  uploadUrl: string,
  file: File,
  { onProgress, signal }: PutFileOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', uploadUrl);
    request.setRequestHeader('Content-Type', file.type);
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });
    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`Storage answered ${request.status}`));
    });
    request.addEventListener('error', () => {
      reject(new Error('Storage could not be reached'));
    });
    request.addEventListener('abort', () => {
      reject(new DOMException('The upload was cancelled', 'AbortError'));
    });
    signal.addEventListener(
      'abort',
      () => {
        request.abort();
      },
      { once: true },
    );
    request.send(file);
  });
}
