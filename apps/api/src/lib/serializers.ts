import type { SessionUser, UserSummary } from '@chirp/shared';

import type { User } from '../generated/prisma/client';

/** Database rows become API DTOs only here, so internal fields never leak by accident. */
export function toUserSummary(user: Pick<User, 'id' | 'username' | 'displayName'>): UserSummary {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    // Avatars arrive with media uploads (C41); until then the client renders initials.
    avatarUrl: null,
  };
}

export function toSessionUser(user: User): SessionUser {
  return {
    ...toUserSummary(user),
    email: user.email,
    bio: user.bio,
    createdAt: user.createdAt.toISOString(),
  };
}
