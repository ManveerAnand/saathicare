"use client";

import { useActionState } from "react";
import { updatePermissions } from "@/app/actions/carePlan";
import type { Permissions } from "@/lib/domain/types";
import { emptyState, Status } from "./Status";
import { SubmitButton } from "./SubmitButton";

export function PermissionsForm({ permissions }: { permissions: Permissions }) {
  const [state, action] = useActionState(updatePermissions, emptyState);
  return (
    <form action={action}>
      <label className="check">
        <input type="checkbox" name="caretakerCanEdit" defaultChecked={permissions.caretakerCanEdit} />
        Caretakers may change my medicines and appointments
      </label>
      <label className="check">
        <input type="checkbox" name="familyCanEdit" defaultChecked={permissions.familyCanEdit} />
        Family may change my medicines and appointments
      </label>
      <label htmlFor="escalateAfterMinutes">
        If I miss a dose, wait this long before telling others <span className="hint">(minutes)</span>
      </label>
      <select
        id="escalateAfterMinutes"
        name="escalateAfterMinutes"
        defaultValue={String(permissions.escalateAfterMinutes)}
      >
        {[0, 15, 30, 60, 120, 240].map((m) => (
          <option key={m} value={m}>
            {m === 0 ? "Tell them straight away" : `${m} minutes`}
          </option>
        ))}
      </select>
      <Status state={state} />
      <SubmitButton>Save my choices</SubmitButton>
    </form>
  );
}
