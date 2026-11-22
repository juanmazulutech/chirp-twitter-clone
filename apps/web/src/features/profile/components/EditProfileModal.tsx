import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  IMAGE_CONTENT_TYPES,
  type UpdateProfileBody,
  updateProfileBodySchema,
  type UserProfile,
} from '@chirp/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert } from 'lucide-react';
import { useRef, useState } from 'react';
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
import { useImageUpload } from '@/features/uploads/use-image-upload';
import { applyServerError } from '@/lib/form-errors';
import { notify } from '@/lib/notify';

import { useUpdateProfile } from '../hooks';

const fields = ['displayName', 'bio', 'avatarKey'] as const;

interface EditProfileModalProps {
  profile: UserProfile;
  open: boolean;
  onClose: () => void;
}

/** The viewer's picture, name and bio; the picture uploads as soon as it is picked. */
export function EditProfileModal({ profile, open, onClose }: EditProfileModalProps) {
  const updateProfile = useUpdateProfile();
  const picture = useImageUpload('avatar');
  const fileInput = useRef<HTMLInputElement>(null);
  const [removePicture, setRemovePicture] = useState(false);
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

  const { upload } = picture;
  // What the picture will be once saved: the new upload, nothing, or the current one.
  const shownPicture =
    upload.status === 'idle' || upload.previewUrl === null
      ? removePicture
        ? null
        : profile.avatarUrl
      : upload.previewUrl;
  const pictureChanged = upload.status === 'ready' || (removePicture && upload.status === 'idle');
  const pictureSettled = upload.status === 'idle' || upload.status === 'ready';

  function clearPicture() {
    picture.remove();
    setRemovePicture(false);
  }

  function close() {
    // Unsaved edits are dropped: the next opening starts from the saved profile.
    reset();
    clearPicture();
    setFormError(null);
    onClose();
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const avatarKey = upload.status === 'ready' ? upload.key : removePicture ? null : undefined;
    try {
      await updateProfile.mutateAsync({ ...values, avatarKey });
    } catch (error) {
      setFormError(applyServerError(error, setError, { fields }));
      return;
    }
    clearPicture();
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
        <div className="flex items-center gap-4">
          <Avatar
            name={displayName || profile.displayName}
            label="Profile picture"
            userId={profile.id}
            src={shownPicture}
            size="lg"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              loading={upload.status === 'uploading'}
              onClick={() => fileInput.current?.click()}
            >
              {shownPicture ? 'Change picture' : 'Add picture'}
            </Button>
            {shownPicture ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  picture.remove();
                  setRemovePicture(true);
                }}
              >
                Remove picture
              </Button>
            ) : null}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept={IMAGE_CONTENT_TYPES.join(',')}
            aria-label="Picture file"
            tabIndex={-1}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Cleared, so choosing the same file again after removing it still fires.
              event.target.value = '';
              if (!file) return;
              setRemovePicture(false);
              void picture.select(file);
            }}
          />
        </div>
        {upload.status === 'failed' ? (
          <p role="alert" className="flex items-start gap-2 text-sm font-medium text-danger">
            <CircleAlert aria-hidden="true" className="mt-px size-4 shrink-0" strokeWidth={1.75} />
            {upload.message}
          </p>
        ) : null}
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
            disabled={!(isDirty || pictureChanged) || !pictureSettled}
            loading={updateProfile.isPending}
          >
            Save
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
