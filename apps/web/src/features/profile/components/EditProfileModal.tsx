import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  type UpdateProfileBody,
  updateProfileBodySchema,
  type UserProfile,
} from '@chirp/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import {
  Field,
  FieldError,
  FieldHint,
  FieldInput,
  FieldLabel,
  FieldTextarea,
} from '@/components/ui/Field';
import { FormAlert } from '@/components/ui/FormAlert';
import { Modal, ModalActions, ModalTitle } from '@/components/ui/Modal';
import { applyServerError } from '@/lib/form-errors';
import { notify } from '@/lib/notify';

import { useUpdateProfile } from '../hooks';

const fields = ['displayName', 'bio'] as const;

interface EditProfileModalProps {
  profile: UserProfile;
  open: boolean;
  onClose: () => void;
}

/** The viewer's name and bio, with live counters; the picture arrives with uploads (C41). */
export function EditProfileModal({ profile, open, onClose }: EditProfileModalProps) {
  const updateProfile = useUpdateProfile();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileBody>({
    resolver: zodResolver(updateProfileBodySchema),
    values: { displayName: profile.displayName, bio: profile.bio },
  });
  // Controlled, so the counters follow `reset()` as well as typing.
  const [displayName, bio] = useWatch({ control, name: ['displayName', 'bio'] });

  function close() {
    // Unsaved edits are dropped: the next opening starts from the saved profile.
    reset();
    setFormError(null);
    onClose();
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await updateProfile.mutateAsync(values);
    } catch (error) {
      setFormError(applyServerError(error, setError, { fields }));
      return;
    }
    onClose();
    notify.success('Your profile is saved');
  });

  return (
    <Modal open={open} onClose={close}>
      <ModalTitle>Edit profile</ModalTitle>
      <form
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        noValidate
        className="flex flex-col gap-4"
      >
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        <div className="flex items-center gap-3">
          <Avatar
            name={displayName || profile.displayName}
            userId={profile.id}
            src={profile.avatarUrl}
            size="lg"
          />
          <p className="text-sm text-ink-muted">Profile pictures are coming soon.</p>
        </div>
        <Field error={errors.displayName?.message}>
          <FieldLabel>Name</FieldLabel>
          <FieldInput
            autoComplete="name"
            maxCharacters={DISPLAY_NAME_MAX_LENGTH}
            data-autofocus
            {...register('displayName')}
            value={displayName}
          />
          <FieldError />
        </Field>
        <Field error={errors.bio?.message}>
          <FieldLabel>Bio</FieldLabel>
          <FieldTextarea rows={3} maxCharacters={BIO_MAX_LENGTH} {...register('bio')} value={bio} />
          <FieldHint>A few words about you, shown on your profile.</FieldHint>
          <FieldError />
        </Field>
        <ModalActions>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!isDirty}
            loading={updateProfile.isPending}
          >
            Save
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
