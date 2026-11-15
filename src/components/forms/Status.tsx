"use client";

import type { FormState } from "@/app/actions/types";

/** The state every form starts from: nothing to report yet. */
export const emptyState: FormState = {};

/** Links an invalid field to the active error message. */
export function fieldError(state: FormState, name: string, errorId: string) {
  return state.error && state.field === name ? { "aria-invalid": true, "aria-describedby": errorId } : {};
}

/** Announces form results to screen readers as well as showing them. */
export function Status({ state, errorId }: { state: FormState; errorId?: string }) {
  return (
    <div aria-live="polite">
      {state.error && (
        <p id={errorId} className="notice error" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && <p className="notice ok">{state.ok}</p>}
    </div>
  );
}
