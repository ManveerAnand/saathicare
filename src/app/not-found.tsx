import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found | SaathiCare" };

/** Gives visitors a way back from a missing route. */
export default function NotFound() {
  return (
    <section className="card" aria-labelledby="not-found-heading">
      <h1 id="not-found-heading">Page not found</h1>
      <p>The page may have moved. You can return home or take the guided tour.</p>
      <div className="row">
        <Link href="/" className="button">
          Go home
        </Link>
        <Link href="/tour">Take the guided tour</Link>
      </div>
    </section>
  );
}
