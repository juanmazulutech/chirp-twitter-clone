import { useParams } from 'react-router';

import { PagePlaceholder } from '@/app/layout/PagePlaceholder';

export function FollowersPage() {
  const { username = '' } = useParams();
  return (
    <PagePlaceholder
      title={`People following @${username}`}
      description="Everyone who follows them will appear here."
    />
  );
}

export function FollowingPage() {
  const { username = '' } = useParams();
  return (
    <PagePlaceholder
      title={`People @${username} follows`}
      description="Everyone they follow will appear here."
    />
  );
}
