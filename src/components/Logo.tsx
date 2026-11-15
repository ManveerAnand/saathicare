/** Two hands holding a heart: care shared between people. Decorative; the name is beside it. */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="12" fill="var(--brand)" />
      <path
        d="M20 29.5s-8.5-5.1-8.5-11a4.6 4.6 0 0 1 8.5-2.5 4.6 4.6 0 0 1 8.5 2.5c0 5.9-8.5 11-8.5 11z"
        fill="var(--accent)"
      />
      <path
        d="M8 26c3 3.5 7.2 5.5 12 5.5S29 29.5 32 26"
        fill="none"
        stroke="var(--brand-ink)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
