"use client";

import { useActionState, useId } from "react";
import { createProfile } from "@/app/actions/auth";
import { emptyState, fieldError, Status } from "./Status";
import { SubmitButton } from "./SubmitButton";

export function SetupForm({ defaultTimeZone }: { defaultTimeZone: string }) {
  const [state, action] = useActionState(createProfile, emptyState);
  const errorId = useId();
  const { values } = state;
  return (
    <form action={action} key={state.errorCount ?? 0}>
      <fieldset>
        <legend>The person being cared for</legend>
        <label htmlFor="elderName">Their name</label>
        <input
          id="elderName"
          name="elderName"
          {...fieldError(state, "elderName", errorId)}
          defaultValue={values?.elderName}
          required
          maxLength={80}
        />
        <label htmlFor="elderEmail">
          Their email <span className="hint">(reminders go here first)</span>
        </label>
        <input
          id="elderEmail"
          name="elderEmail"
          {...fieldError(state, "elderEmail", errorId)}
          type="email"
          defaultValue={values?.elderEmail}
          required
        />
        <label htmlFor="timeZone">Time zone</label>
        <input
          id="timeZone"
          name="timeZone"
          {...fieldError(state, "timeZone", errorId)}
          defaultValue={values?.timeZone ?? defaultTimeZone}
          required
        />
      </fieldset>

      <fieldset>
        <legend>Passcodes, one for each role</legend>
        <p className="hint">Different numbers, 6 to 12 digits. Share each one only with that person.</p>
        <label htmlFor="elderPasscode">
          Elder <span className="hint">(full control)</span>
        </label>
        <input
          id="elderPasscode"
          name="elderPasscode"
          {...fieldError(state, "elderPasscode", errorId)}
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          required
        />
        <label htmlFor="caretakerPasscode">
          Caretaker <span className="hint">(can edit, if the elder allows)</span>
        </label>
        <input
          id="caretakerPasscode"
          name="caretakerPasscode"
          {...fieldError(state, "caretakerPasscode", errorId)}
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          required
        />
        <label htmlFor="familyPasscode">
          Family <span className="hint">(can view and confirm doses)</span>
        </label>
        <input
          id="familyPasscode"
          name="familyPasscode"
          {...fieldError(state, "familyPasscode", errorId)}
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          required
        />
      </fieldset>

      <fieldset>
        <legend>Who else should hear about missed doses?</legend>
        {[0, 1, 2].map((i) => (
          <div className="grid" key={i}>
            <div>
              <label htmlFor={`contactName${i}`}>Name {i + 1}</label>
              <input
                id={`contactName${i}`}
                name={`contactName${i}`}
                {...fieldError(state, `contactName${i}`, errorId)}
                defaultValue={values?.[`contactName${i}`]}
                maxLength={80}
              />
            </div>
            <div>
              <label htmlFor={`contactEmail${i}`}>Email {i + 1}</label>
              <input
                id={`contactEmail${i}`}
                name={`contactEmail${i}`}
                {...fieldError(state, `contactEmail${i}`, errorId)}
                type="email"
                defaultValue={values?.[`contactEmail${i}`]}
              />
            </div>
            <div>
              <label htmlFor={`contactRole${i}`}>Role {i + 1}</label>
              <select
                id={`contactRole${i}`}
                name={`contactRole${i}`}
                {...fieldError(state, `contactRole${i}`, errorId)}
                defaultValue={values?.[`contactRole${i}`] ?? (i === 0 ? "caretaker" : "family")}
              >
                <option value="caretaker">Caretaker</option>
                <option value="family">Family</option>
              </select>
            </div>
          </div>
        ))}
      </fieldset>
      <Status state={state} errorId={errorId} />
      <SubmitButton className="big">Create care circle</SubmitButton>
    </form>
  );
}
