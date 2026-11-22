import type { SessionUser, Tweet, UserProfile } from '@chirp/shared';

/** The signed-in user the base handlers answer with, unless a test says otherwise. */
export const sessionUser: SessionUser = {
  id: '0f6f8f8e-2d4b-4c7a-9a51-3d2b6c1e7a10',
  username: 'ana_codes',
  displayName: 'Ana Torres',
  avatarUrl: null,
  email: 'ana@chirp.dev',
  bio: 'Writes code, reads poetry.',
  createdAt: '2026-11-01T09:30:00.000Z',
};

/** What `POST /auth/login` and `/auth/register` answer with for `sessionUser`. */
export const authResponse = {
  user: {
    id: sessionUser.id,
    username: sessionUser.username,
    displayName: sessionUser.displayName,
    avatarUrl: sessionUser.avatarUrl,
  },
};

let tweetSequence = 0;

/** A chirp by `sessionUser` with a unique id; any field can be overridden. */
export function tweetFixture(overrides: Partial<Tweet> = {}): Tweet {
  tweetSequence += 1;
  return {
    id: `019a0000-0000-7000-8000-${String(tweetSequence).padStart(12, '0')}`,
    content: `Test chirp ${tweetSequence}`,
    imageUrl: null,
    createdAt: '2026-11-21T10:00:00.000Z',
    author: authResponse.user,
    likeCount: 0,
    likedByMe: false,
    ...overrides,
  };
}

/** Bruno's public profile, as another user sees it; any field can be overridden. */
export function profileFixture(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: '019a0000-0000-7000-8000-0000000000b0',
    username: 'bruno',
    displayName: 'Bruno Silva',
    avatarUrl: null,
    bio: 'Bakes bread, ships code.',
    createdAt: '2026-04-02T18:45:00.000Z',
    followersCount: 8,
    followingCount: 12,
    tweetsCount: 3,
    isFollowing: false,
    isMe: false,
    ...overrides,
  };
}
