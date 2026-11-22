import { type RegisterBody, registerBodySchema } from '@chirp/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { Field, FieldError, FieldHint, FieldInput, FieldLabel } from '@/components/ui/Field';
import { FormAlert } from '@/components/ui/FormAlert';
import { applyServerError } from '@/lib/form-errors';
import { notify } from '@/lib/notify';

import { useRegister } from '../hooks';
import { PasswordInput } from './PasswordInput';

const fields = ['displayName', 'username', 'email', 'password'] as const;

export function RegisterForm() {
  const registerAccount = useRegister();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterBody>({
    resolver: zodResolver(registerBodySchema),
    mode: 'onTouched',
    defaultValues: { displayName: '', username: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await registerAccount.mutateAsync(values);
      notify.success('Welcome to Chirp. Follow a few people to fill your timeline.');
    } catch (error) {
      setFormError(applyServerError(error, setError, { fields }));
    }
  });

  return (
    <form
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      noValidate
      className="flex flex-col gap-5"
    >
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      <Field error={errors.displayName?.message}>
        <FieldLabel>Name</FieldLabel>
        <FieldInput autoComplete="name" {...register('displayName')} />
        <FieldHint>Shown on your profile and chirps. You can change it later.</FieldHint>
        <FieldError />
      </Field>
      <Field error={errors.username?.message}>
        <FieldLabel>Username</FieldLabel>
        <FieldInput
          // Not "username": password managers must save the email, which is what sign-in asks for.
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          {...register('username')}
        />
        <FieldHint>
          3–15 letters, numbers or underscores. Your profile lives at /username.
        </FieldHint>
        <FieldError />
      </Field>
      <Field error={errors.email?.message}>
        <FieldLabel>Email</FieldLabel>
        <FieldInput
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          {...register('email')}
        />
        <FieldHint>For signing in. Never shown on your profile.</FieldHint>
        <FieldError />
      </Field>
      <Field error={errors.password?.message}>
        <FieldLabel>Password</FieldLabel>
        <PasswordInput autoComplete="new-password" {...register('password')} />
        <FieldHint>At least 8 characters.</FieldHint>
        <FieldError />
      </Field>
      <Button type="submit" variant="primary" loading={registerAccount.isPending} className="mt-1">
        Create account
      </Button>
    </form>
  );
}
