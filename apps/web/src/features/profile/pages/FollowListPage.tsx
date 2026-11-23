import { useParams } from 'react-router';

import { PageHeading } from '@/app/layout/PageHeading';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfiniteList } from '@/components/ui/InfiniteList';
import { NavTab, NavTabs } from '@/components/ui/NavTabs';

import { UserRow } from '../components/UserRow';
import { useFollowList, useProfile } from '../hooks';
import type { FollowList } from '../keys';

const tabs: Array<{ list: FollowList; label: string }> = [
  { list: 'followers', label: 'Followers' },
  { list: 'following', label: 'Following' },
];

function emptyCopy(list: FollowList, username: string, isMe: boolean) {
  if (list === 'followers') {
    return isMe
      ? { title: 'No followers yet', description: 'When someone follows you, they’ll appear here.' }
      : {
          title: 'No followers yet',
          description: `When someone follows @${username}, they’ll appear here.`,
        };
  }
  return isMe
    ? { title: 'You don’t follow anyone yet', description: 'Find people to follow from search.' }
    : {
        title: 'Not following anyone yet',
        description: `When @${username} follows someone, they’ll appear here.`,
      };
}

/** Followers and following as two tabs of one page, each at its own address. */
function FollowListView({ list }: { list: FollowList }) {
  const username = (useParams().username ?? '').toLowerCase();
  const profile = useProfile(username);
  const users = useFollowList(username, list);
  const name = profile.data?.displayName ?? `@${username}`;
  const empty = emptyCopy(list, username, profile.data?.isMe ?? false);
  const listLabel = list === 'followers' ? `People following ${name}` : `People ${name} follows`;

  return (
    <>
      <PageHeading title={name} />
      <NavTabs label="Follow lists">
        {tabs.map((tab) => (
          <NavTab key={tab.list} to={`/${username}/${tab.list}`}>
            {tab.label}
          </NavTab>
        ))}
      </NavTabs>
      <InfiniteList
        query={users}
        label={listLabel}
        noun="people"
        getKey={(user) => user.id}
        renderItem={(user) => <UserRow user={user} />}
        empty={<EmptyState title={empty.title} description={empty.description} />}
        endMessage="That’s everyone."
      />
    </>
  );
}

export function FollowersPage() {
  return <FollowListView list="followers" />;
}

export function FollowingPage() {
  return <FollowListView list="following" />;
}
