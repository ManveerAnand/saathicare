"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import { emptyState, Status } from "./Status";
import { SubmitButton } from "./SubmitButton";

export function SignInForm() {
  const [state, action] = useActionState(signIn, emptyState);
  return (
    <form action={action} key={state.errorCount ?? 0}>
      <label htmlFor="profileId">Care code</label>
      <input id="profileId" name="profileId" defaultValue={state.values?.profileId} autoComplete="username" required autoCapitalize="none" />
      <label htmlFor="passcode">
        Passcode <span className="hint">(6 to 12 digits)</span>
      </label>
      <input id="passcode" name="passcode" type="password" inputMode="numeric" autoComplete="current-password" required />
      <Status state={state} />
      <SubmitButton className="big">Open care circle</SubmitButton>
    </form>
  );
}
