import type { Tweet } from '@chirp/shared';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';

import { tweetPath } from '../tweet-path';

/**
 * Leaves a conversation. After moving around the app it goes back where the reader was; on a
 * direct visit there is nowhere in the app to go back to, so it goes up the thread instead:
 * to the chirp this one answers, or home for a top-level chirp.
 */
export function ConversationBackButton({ tweet }: { tweet: Pick<Tweet, 'replyTo'> }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Back"
      onClick={() => {
        if (location.key !== 'default') void navigate(-1);
        else void navigate(tweet.replyTo ? tweetPath(tweet.replyTo) : '/home');
      }}
    >
      <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={1.75} />
    </Button>
  );
}
