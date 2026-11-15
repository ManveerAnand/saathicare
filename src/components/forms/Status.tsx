"use client";

import type { FormState } from "@/app/actions/types";

/** The state every form starts from: nothing to report yet. */
export const emptyState: FormState = {};

/** Announces form results to screen readers as well as showing them. */
export function Status({ state }: { state: FormState }) {
  return (
    <div aria-live="polite">
      {state.error && <p className="notice error" role="alert">{state.error}</p>}
      {state.ok && <p className="notice ok">{state.ok}</p>}
    </div>
  );
}
