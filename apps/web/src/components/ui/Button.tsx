import type { ComponentProps } from 'react';
import { Link } from 'react-router';

import { buttonClasses, type ButtonStyleOptions } from './button-classes';
import { Spinner } from './Spinner';

interface ButtonProps extends ComponentProps<'button'>, ButtonStyleOptions {
  /** Shows a spinner and blocks the action; the width does not change. */
  loading?: boolean;
}

export function Button({
  variant,
  size,
  className,
  loading = false,
  disabled,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      <span className={`inline-flex items-center gap-2 ${loading ? 'invisible' : ''}`}>
        {children}
      </span>
      {loading ? (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner label={null} className="size-5" />
        </span>
      ) : null}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & ButtonStyleOptions;

/** Navigation that looks like a button (e.g. "Sign up" on the sign-in page). */
export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}
