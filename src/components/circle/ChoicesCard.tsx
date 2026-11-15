import { PermissionsForm } from "@/components/forms";
import type { Permissions } from "@/lib/domain/types";

/** The elder's own controls: who may edit, and when others hear about a missed dose. */
export function ChoicesCard({ permissions }: { permissions: Permissions }) {
  return (
    <section className="card" aria-labelledby="choices">
      <h2 id="choices">Your choices</h2>
      <p>You decide who can change your care plan, and when others are told about a missed dose.</p>
      <PermissionsForm permissions={permissions} />
    </section>
  );
}
