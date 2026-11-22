import { type LoginBody, loginBodySchema } from '@chirp/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { Field, FieldError, FieldInput, FieldLabel } from '@/components/ui/Field';
import { FormAlert } from '@/components/ui/FormAlert';
import { applyServerError } from '@/lib/form-errors';

import { DEMO_ACCOUNT } from '../demo-account';
import { useLogin } from '../hooks';
import { PasswordInput } from './PasswordInput';

const fields = ['email', 'password'] as const;

export function LoginForm() {
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<LoginBody>({
    resolver: zodResolver(loginBodySchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login.mutateAsync(values);
    } catch (error) {
      setFormError(
        applyServerError(error, setError, {
          fields,
          // The API never says which of the two was wrong, and neither do we.
          unauthenticated: 'That email and password don’t match. Check both and try again.',
        }),
      );
    }
  });

  function fillDemoAccount() {
    setFormError(null);
    setValue('email', DEMO_ACCOUNT.email, { shouldValidate: true });
    setValue('password', DEMO_ACCOUNT.password, { shouldValidate: true });
    setFocus('password');
  }

  return (
    <form
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      noValidate
      className="flex flex-col gap-5"
    >
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      <Field error={errors.email?.message}>
        <FieldLabel>Email</FieldLabel>
        <FieldInput
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          {...register('email')}
        />
        <FieldError />
      </Field>
      <Field error={errors.password?.message}>
        <FieldLabel>Password</FieldLabel>
        <PasswordInput autoComplete="current-password" {...register('password')} />
        <FieldError />
      </Field>
      <div className="flex flex-col gap-3 pt-1">
        <Button type="submit" variant="primary" loading={login.isPending}>
          Sign in
        </Button>
        <Button onClick={fillDemoAccount} disabled={login.isPending}>
          Use the demo account
        </Button>
      </div>
    </form>
  );
}
