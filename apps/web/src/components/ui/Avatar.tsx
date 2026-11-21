import { useState } from 'react';

import { avatarColorOf, initialsOf } from './avatar-utils';

export type AvatarSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-20 text-2xl',
};

interface AvatarProps {
  name: string;
  /**
   * Accessible name, for an avatar that stands alone. Omit it next to the visible name
   * (the usual case): the avatar is then decorative, so the name is not read twice.
   */
  label?: string;
  userId: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}

/** The user's picture, or their initials (from `name`) on a colour derived from their id. */
export function Avatar({ name, label, userId, src, size = 'md', className = '' }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && src !== failedSrc;
  const shape = `inline-grid shrink-0 place-items-center overflow-hidden rounded-full ${sizeClasses[size]} ${className}`;

  return showImage ? (
    <img
      src={src ?? undefined}
      alt={label ?? ''}
      className={`${shape} bg-hairline object-cover`}
      onError={() => setFailedSrc(src ?? null)}
    />
  ) : (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`${shape} font-semibold text-white ${avatarColorOf(userId)}`}
    >
      <span aria-hidden="true">{initialsOf(name)}</span>
    </span>
  );
}
