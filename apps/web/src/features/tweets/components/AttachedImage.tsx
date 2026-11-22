import { CircleAlert, X } from 'lucide-react';

import type { ImageUpload } from '@/features/uploads/use-image-upload';

interface AttachedImageProps {
  upload: Exclude<ImageUpload, { status: 'idle' }>;
  onRemove: () => void;
}

/** The image about to go out with a chirp: its preview, upload progress, or what went wrong. */
export function AttachedImage({ upload, onRemove }: AttachedImageProps) {
  const percent = upload.status === 'uploading' ? Math.round(upload.progress * 100) : null;

  return (
    <div className="flex flex-col gap-2">
      {upload.previewUrl ? (
        <div className="relative overflow-hidden rounded-lg border border-hairline">
          <img
            src={upload.previewUrl}
            alt="Image to attach"
            className="aspect-video w-full object-cover"
          />
          <button
            type="button"
            aria-label="Remove image"
            onClick={onRemove}
            className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-sheet text-ink transition-colors duration-150 hover:bg-paper"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </button>
          {percent === null ? null : (
            <div
              role="progressbar"
              aria-label="Uploading image"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="absolute inset-x-0 bottom-0 h-1 bg-hairline"
            >
              <div className="h-full bg-airmail-blue" style={{ width: `${percent}%` }} />
            </div>
          )}
        </div>
      ) : null}
      {upload.status === 'failed' ? (
        <p role="alert" className="flex items-start gap-2 text-sm font-medium text-danger">
          <CircleAlert aria-hidden="true" className="mt-px size-4 shrink-0" strokeWidth={1.75} />
          <span className="flex-1">{upload.message}</span>
          {upload.previewUrl ? null : (
            <button
              type="button"
              onClick={onRemove}
              className="text-ink-muted underline underline-offset-2 hover:text-ink"
            >
              Dismiss
            </button>
          )}
        </p>
      ) : null}
    </div>
  );
}
