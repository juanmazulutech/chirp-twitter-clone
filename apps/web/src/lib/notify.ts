import { toast } from 'sonner';

/**
 * The app's only way to show a toast. Wrapping the library keeps every call site
 * independent of it: replacing Sonner means changing this file and Toaster.tsx.
 *
 * Close any open Modal before notifying: a native <dialog> sits in the browser's top
 * layer, so a toast shown while it is open would sit under its backdrop.
 */
export const notify = {
  success(message: string): void {
    toast.success(message);
  },
  error(message: string): void {
    toast.error(message);
  },
};
