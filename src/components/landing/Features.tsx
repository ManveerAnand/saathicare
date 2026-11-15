/** Introduces SaathiCare's core care features. */
export function Features() {
  return (
    <section className="features" aria-label="What SaathiCare does">
      <Feature title="One tap: taken" icon="check">
        Big, clear buttons for every dose. Anyone in the circle can confirm, so family can help from afar.
      </Feature>
      <Feature title="Snap a prescription" icon="camera">
        Gemini reads the photo and drafts each medicine. Nothing is saved until a person checks it.
      </Feature>
      <Feature title="Reminders that respect people" icon="bell">
        Email before each dose. If one is missed, the elder hears first; family only after the delay they chose.
      </Feature>
      <Feature title="A Care Assistant" icon="spark">
        Plain guidance from the day&apos;s context: missed doses, double-dose risks, visits to prepare for.
      </Feature>
    </section>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
};

function Feature({ title, icon, children }: { title: string; icon: keyof typeof ICONS; children: React.ReactNode }) {
  return (
    <article className="card feature">
      <div className="icon">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {ICONS[icon]}
        </svg>
      </div>
      <h3>{title}</h3>
      <p className="muted">{children}</p>
    </article>
  );
}
