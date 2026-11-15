import Link from "next/link";
import { resetDemo } from "@/app/actions/demo";
import type { Role } from "@/lib/domain/types";
import { ROLE_LABEL } from "@/lib/presentation";

/** Explains the shared demo circle and lets visitors reset it. */
export function DemoBanner({ role }: { role: Role }) {
  return (
    <div className="notice info" role="note">
      <p className="flush">
        You are exploring the shared demo as <strong>{ROLE_LABEL[role].toLowerCase()}</strong>. Try marking a dose, or
        sign out and enter as another role to see how the view changes.{" "}
        <Link href="/tour">Take the 2-minute judges&apos; tour</Link>
      </p>
      <form action={resetDemo} className="demo-reset">
        <button type="submit" className="secondary">
          Reset demo data
        </button>
      </form>
    </div>
  );
}
