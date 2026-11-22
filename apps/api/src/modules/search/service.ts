import type { FollowListUser, Page, UserSearchQuery } from '@chirp/shared';

import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { type Cursor, decodeCursor, keysetAfter, newestFirst, toPage } from '../../lib/cursor';
import { followListUserRowSelect, toFollowListUser } from '../../lib/serializers';
import type { StorageService } from '../../lib/storage';

export interface SearchServiceDependencies {
  prisma: PrismaClient;
  storage: Pick<StorageService, 'publicUrl'>;
}

export type SearchService = ReturnType<typeof createSearchService>;

/** LIKE treats `%` and `_` as wildcards; usernames contain `_`, so both are matched literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Matches in relevance order: the exact username, then usernames that start with the term,
 * then any other username or display name containing it. Usernames are stored lowercase
 * (ADR-18); display names match case-insensitively, served by the trigram indexes.
 */
function tiers(term: string): Prisma.UserWhereInput[] {
  const username = term.toLowerCase();
  const pattern = escapeLike(username);
  return [
    { username },
    { username: { startsWith: pattern }, NOT: { username } },
    {
      NOT: { username: { startsWith: pattern } },
      OR: [
        { username: { contains: pattern } },
        { displayName: { contains: escapeLike(term), mode: 'insensitive' } },
      ],
    },
  ];
}

/** Which tier a user belongs to for `term`; the inverse of `tiers`, used to resume a page. */
function tierOf(user: { username: string }, term: string): number {
  const username = term.toLowerCase();
  if (user.username === username) return 0;
  return user.username.startsWith(username) ? 1 : 2;
}

export function createSearchService({ prisma, storage }: SearchServiceDependencies) {
  /**
   * People whose username or display name contains `q`, best matches first and, within each
   * tier, newest accounts first. Pages use the usual `(createdAt, id)` cursor: the cursor's
   * user tells which tier the next page resumes in (usernames never change).
   */
  async function users(
    viewerId: string,
    { q, cursor, limit }: UserSearchQuery,
  ): Promise<Page<FollowListUser>> {
    const after: Cursor | undefined = cursor === undefined ? undefined : decodeCursor(cursor);
    const where = tiers(q);

    let startTier = 0;
    if (after) {
      const last = await prisma.user.findUnique({
        where: { id: after.id },
        select: { username: true },
      });
      // A user deleted since the last page: continue with the broadest tier, which never repeats rows.
      startTier = last ? tierOf(last, q) : where.length - 1;
    }

    const select = { ...followListUserRowSelect(viewerId), createdAt: true } as const;
    const rows: Array<Prisma.UserGetPayload<{ select: typeof select }>> = [];
    for (let tier = startTier; tier < where.length && rows.length <= limit; tier += 1) {
      const resume = tier === startTier ? keysetAfter(after) : {};
      rows.push(
        ...(await prisma.user.findMany({
          where: { AND: [where[tier] ?? {}, resume] },
          orderBy: newestFirst,
          take: limit + 1 - rows.length,
          select,
        })),
      );
    }
    return toPage(rows, limit, (row) => toFollowListUser(row, (key) => storage.publicUrl(key)));
  }

  return { users };
}
