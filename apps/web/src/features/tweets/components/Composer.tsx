import {
  type CreateTweetBody,
  createTweetBodySchema,
  IMAGE_CONTENT_TYPES,
  TWEET_MAX_LENGTH,
  tweetContentSchema,
} from '@chirp/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus } from 'lucide-react';
import { type KeyboardEvent, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Field, FieldError, FieldTextarea } from '@/components/ui/Field';
import { FormAlert } from '@/components/ui/FormAlert';
import { useSession } from '@/features/auth/hooks';
import { useImageUpload } from '@/features/uploads/use-image-upload';
import { applyServerError } from '@/lib/form-errors';
import { notify } from '@/lib/notify';

import { useCreateTweet } from '../hooks';
import { AttachedImage } from './AttachedImage';

const fields = ['content'] as const;
const PROMPT = 'What’s happening?';

interface ComposerProps {
  /** Runs once a chirp is posted, before the confirmation toast (a modal closes here). */
  onPosted?: () => void;
  /** Ask the surrounding `Modal` to focus the text when it opens. */
  focusOnOpen?: boolean;
}

/** Writes and posts a chirp; the limit is shown while typing, before it is hit. */
export function Composer({ onPosted, focusOnOpen = false }: ComposerProps) {
  const { user } = useSession();
  const createTweet = useCreateTweet();
  const image = useImageUpload('tweet');
  const fileInput = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateTweetBody>({
    resolver: zodResolver(createTweetBodySchema),
    defaultValues: { content: '' },
  });
  // Controlled, so the counter follows `reset()` as well as typing.
  const content = useWatch({ control, name: 'content' });
  // An image still uploading, or one that failed, would be lost: it must be ready or removed.
  const imageSettled = image.upload.status === 'idle' || image.upload.status === 'ready';
  const canSubmit =
    tweetContentSchema.safeParse(content).success && imageSettled && !createTweet.isPending;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const imageKey = image.upload.status === 'ready' ? image.upload.key : undefined;
    try {
      await createTweet.mutateAsync({ ...values, imageKey });
    } catch (error) {
      setFormError(applyServerError(error, setError, { fields }));
      return;
    }
    reset();
    image.remove();
    onPosted?.();
    notify.success('Your chirp is posted');
  });

  function submitOnShortcut(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    if (canSubmit) void onSubmit();
  }

  return (
    <form
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      noValidate
      className="flex gap-3"
    >
      {user ? <Avatar name={user.displayName} userId={user.id} src={user.avatarUrl} /> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        <Field error={errors.content?.message}>
          <FieldTextarea
            aria-label={PROMPT}
            placeholder={PROMPT}
            maxCharacters={TWEET_MAX_LENGTH}
            rows={3}
            data-autofocus={focusOnOpen || undefined}
            onKeyDown={submitOnShortcut}
            {...register('content')}
            value={content}
          />
          <FieldError />
        </Field>
        {image.upload.status === 'idle' ? null : (
          <AttachedImage upload={image.upload} onRemove={image.remove} />
        )}
        <div className="flex items-center justify-between">
          {/* One image per chirp: the button waits until the current one is removed. */}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Add image"
            disabled={image.upload.status !== 'idle'}
            onClick={() => fileInput.current?.click()}
            className="-ml-2"
          >
            <ImagePlus aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept={IMAGE_CONTENT_TYPES.join(',')}
            aria-label="Image file"
            tabIndex={-1}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Cleared, so choosing the same file again after removing it still fires.
              event.target.value = '';
              if (file) void image.select(file);
            }}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!canSubmit}
            loading={createTweet.isPending}
          >
            Chirp
          </Button>
        </div>
      </div>
    </form>
  );
}
