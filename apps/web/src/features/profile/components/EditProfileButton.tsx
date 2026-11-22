import type { UserProfile } from '@chirp/shared';
import { Pencil } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';

import { EditProfileModal } from './EditProfileModal';

/** The action on your own profile, where other people's profiles have Follow. */
export function EditProfileButton({ profile }: { profile: UserProfile }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        <Pencil aria-hidden="true" className="size-4" strokeWidth={1.75} />
        Edit profile
      </Button>
      <EditProfileModal
        profile={profile}
        open={open}
        onClose={() => {
          setOpen(false);
        }}
      />
    </>
  );
}
