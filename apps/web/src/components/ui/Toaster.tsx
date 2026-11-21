import { CircleAlert, CircleCheck } from 'lucide-react';
import { Toaster as SonnerToaster } from 'sonner';

const icon = 'size-5 shrink-0';

/**
 * Toast region (Sonner, unstyled), dressed in Chirp's tokens. Mounted once in the
 * app providers; show toasts through `notify` (lib/notify.ts), never Sonner directly.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      // Clear the 64px bottom navigation on phones.
      mobileOffset={{ bottom: 80 }}
      duration={5000}
      containerAriaLabel="Notifications"
      icons={{
        success: (
          <CircleCheck aria-hidden="true" className={`${icon} text-ink`} strokeWidth={1.75} />
        ),
        error: (
          <CircleAlert aria-hidden="true" className={`${icon} text-danger`} strokeWidth={1.75} />
        ),
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-center gap-3 rounded-card border border-hairline bg-sheet px-4 py-3 text-ink shadow-float',
          title: 'text-[0.9375rem] leading-5 font-medium',
          description: 'text-sm text-ink-muted',
          error: 'border-danger',
        },
      }}
    />
  );
}
