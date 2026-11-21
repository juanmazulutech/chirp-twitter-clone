interface SpinnerProps {
  /** Accessible name; pass `null` when a parent already announces the busy state. */
  label?: string | null;
  className?: string;
}

/** A ring that turns while work is in progress; still under reduced motion. */
export function Spinner({ label = 'Loading', className = 'size-5' }: SpinnerProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin motion-reduce:animate-none ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : true}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
