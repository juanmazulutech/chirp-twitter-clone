import { useParams } from 'react-router';

import { PagePlaceholder } from '@/app/layout/PagePlaceholder';

export function ProfilePage() {
  const { username = '' } = useParams();
  return (
    <PagePlaceholder
      title={`@${username}`}
      description="Their profile and chirps will appear here."
    />
  );
}
