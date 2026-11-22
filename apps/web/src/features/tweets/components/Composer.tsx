import {
  type CreateTweetBody,
  createTweetBodySchema,
  TWEET_MAX_LENGTH,
  tweetContentSchema,
} from '@chirp/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { type KeyboardEvent, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Field, FieldError, FieldTextarea } from '@/components/ui/Field';
import { FormAlert } from '@/components/ui/FormAlert';
import { useSession } from '@/features/auth/hooks';
import { applyServerError } from '@/lib/form-errors';
import { notify } from '@/lib/notify';

import { useCreateTweet } from '../hooks';

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
  const canSubmit = tweetContentSchema.safeParse(content).success && !createTweet.isPending;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await createTweet.mutateAsync(values);
    } catch (error) {
      setFormError(applyServerError(error, setError, { fields }));
      return;
    }
    reset();
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
        <div className="flex justify-end">
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
