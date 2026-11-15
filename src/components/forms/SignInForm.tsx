"use client";

import { useActionState, useId } from "react";
import { signIn } from "@/app/actions/auth";
import { emptyState, fieldError, Status } from "./Status";
import { SubmitButton } from "./SubmitButton";

/** Opens a care circle using a care code and passcode. */
export function SignInForm() {
  const [state, action] = useActionState(signIn, emptyState);
  const errorId = useId();
  return (
    <form action={action} key={state.errorCount ?? 0}>
      <label htmlFor="profileId">Care code</label>
      <input
        id="profileId"
        name="profileId"
        {...fieldError(state, "profileId", errorId)}
        defaultValue={state.values?.profileId}
        autoComplete="username"
        required
        autoCapitalize="none"
      />
      <label htmlFor="passcode">
        Passcode <span className="hint">(6 to 12 digits)</span>
      </label>
      <input
        id="passcode"
        name="passcode"
        {...fieldError(state, "passcode", errorId)}
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        required
      />
      <Status state={state} errorId={errorId} />
      <SubmitButton className="big">Open care circle</SubmitButton>
    </form>
  );
}
