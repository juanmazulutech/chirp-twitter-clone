/**
 * - primary: the one main action on a screen (Chirp, Sign in). Airmail red.
 * - secondary: other actions (Follow, Cancel).
 * - ghost: quiet actions in toolbars and menus.
 * - danger: confirming something destructive (Delete chirp).
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
/**
 * - md / sm: labelled buttons.
 * - icon: a 48px round button holding only an icon (give it an aria-label).
 */
export type ButtonSize = 'md' | 'sm' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-airmail-red text-on-airmail-red hover:brightness-95 active:brightness-90',
  secondary: 'border border-hairline bg-sheet text-ink hover:bg-paper active:brightness-95',
  ghost: 'text-ink-muted hover:bg-paper hover:text-ink active:brightness-95',
  // Outlined so it never reads as the primary action, even next to it.
  danger: 'border border-danger bg-sheet text-danger hover:bg-danger hover:text-on-danger',
};

const sizeClasses: Record<ButtonSize, string> = {
  md: 'h-11 px-5 text-base',
  sm: 'h-9 px-4 text-sm',
  icon: 'size-12',
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/** Shared by `Button` and `ButtonLink`, so a link styled as a button matches exactly. */
export function buttonClasses({
  variant = 'secondary',
  size = 'md',
  className = '',
}: ButtonStyleOptions = {}): string {
  return [
    'relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap',
    'transition-[background-color,color,filter] duration-150',
    // A busy (loading) button keeps its full colour; only genuinely disabled ones fade.
    '[&:disabled:not([aria-busy])]:cursor-not-allowed [&:disabled:not([aria-busy])]:opacity-50 aria-busy:cursor-wait',
    'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    className,
  ].join(' ');
}
