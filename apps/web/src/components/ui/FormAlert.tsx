import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * A problem with a whole form rather than one field (wrong credentials, too many attempts,
 * no connection). Announced when it appears; led by an icon so it never relies on colour.
 */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-danger bg-sheet px-3 py-2.5 text-sm font-medium text-danger"
    >
      <CircleAlert aria-hidden="true" className="mt-px size-4 shrink-0" strokeWidth={1.75} />
      <p>{children}</p>
    </div>
  );
}
