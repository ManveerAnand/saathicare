"use client";

import Link from "next/link";

/** Offers a retry when a page cannot be displayed. */
export default function AppError({ retry }: { retry: () => void }) {
  return (
    <section className="card" aria-labelledby="error-heading">
      <h1 id="error-heading">Something went wrong</h1>
      <div className="row">
        <button type="button" onClick={retry}>
          Try again
        </button>
        <Link href="/">Go home</Link>
      </div>
    </section>
  );
}
