/** Doses taken today as a ring. The numbers are real text, so screen readers get them too. */
export function ProgressRing({ done, total, size = 120 }: { done: number; total: number; size?: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const fraction = total ? Math.min(done / total, 1) : 0;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
        {fraction > 0 && (
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${c * fraction} ${c}`}
          />
        )}
      </svg>
      <div className="ring-label">
        <div>
          <strong>
            {done}/{total}
          </strong>
          <span>doses today</span>
        </div>
      </div>
    </div>
  );
}
