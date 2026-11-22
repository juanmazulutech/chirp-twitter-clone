import { presignUploadBodySchema, type UploadPurpose } from '@chirp/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

import { isApiError } from '@/lib/api-client';

import { presignUpload, putFile } from './api';

export type ImageUpload =
  | { status: 'idle' }
  | { status: 'uploading'; previewUrl: string; progress: number }
  | { status: 'ready'; previewUrl: string; key: string }
  | { status: 'failed'; previewUrl: string | null; message: string };

const UPLOAD_FAILED = 'The image didn’t upload. Check your connection and try again.';

/**
 * One image on its way to storage: checked against the shared limits first, previewed from
 * the local file at once, then presigned and sent with progress (ADR-14). Picking another
 * file or removing it cancels the upload in flight; the preview URL is always released.
 */
export function useImageUpload(purpose: UploadPurpose) {
  const [upload, setUpload] = useState<ImageUpload>({ status: 'idle' });
  const controller = useRef<AbortController | null>(null);
  const previewUrl = useRef<string | null>(null);

  const release = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
  }, []);

  useEffect(() => release, [release]);

  const remove = useCallback(() => {
    release();
    setUpload({ status: 'idle' });
  }, [release]);

  const select = useCallback(
    async (file: File) => {
      release();
      // The same rules the API applies, so an unusable file never leaves the device.
      const body = presignUploadBodySchema.safeParse({
        purpose,
        contentType: file.type,
        size: file.size,
      });
      if (!body.success) {
        setUpload({
          status: 'failed',
          previewUrl: null,
          message: body.error.issues[0]?.message ?? UPLOAD_FAILED,
        });
        return;
      }

      const current = new AbortController();
      controller.current = current;
      const preview = URL.createObjectURL(file);
      previewUrl.current = preview;
      setUpload({ status: 'uploading', previewUrl: preview, progress: 0 });

      try {
        const { uploadUrl, key } = await presignUpload(body.data);
        await putFile(uploadUrl, file, {
          signal: current.signal,
          onProgress: (progress) => {
            if (!current.signal.aborted) {
              setUpload({ status: 'uploading', previewUrl: preview, progress });
            }
          },
        });
        if (!current.signal.aborted) setUpload({ status: 'ready', previewUrl: preview, key });
      } catch (error) {
        if (current.signal.aborted) return;
        // The API's own message when it refused the file (e.g. a lower size limit).
        const message = isApiError(error, 400) ? error.message : UPLOAD_FAILED;
        setUpload({ status: 'failed', previewUrl: preview, message });
      }
    },
    [purpose, release],
  );

  return { upload, select, remove };
}
