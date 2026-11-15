/** Announces that the care circle is loading without animating the placeholder. */
export default function LoadingCircle() {
  return (
    <div className="card" role="status">
      <span className="sr-only">Loading your care circle…</span>
      <div className="circle-loading-skeleton" aria-hidden="true">
        <span />
        <span />
      </div>
    </div>
  );
}
