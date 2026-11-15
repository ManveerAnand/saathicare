"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createProfile,
  saveAppointment,
  saveMedication,
  scanPrescription,
  signIn,
  updatePermissions,
  type FormState,
  type ScanState,
} from "@/app/actions";
import type { Medication, Permissions } from "@/lib/domain/types";
import type { ExtractedMedication } from "@/lib/validation";

const empty: FormState = {};

export function SubmitButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? "Working…" : children}
    </button>
  );
}

/** Announces form results to screen readers as well as showing them. */
function Status({ state }: { state: FormState }) {
  return (
    <div aria-live="polite">
      {state.error && <p className="notice error" role="alert">{state.error}</p>}
      {state.ok && <p className="notice ok">{state.ok}</p>}
    </div>
  );
}

export function SignInForm() {
  const [state, action] = useActionState(signIn, empty);
  return (
    <form action={action}>
      <label htmlFor="profileId">Care code</label>
      <input id="profileId" name="profileId" autoComplete="username" required autoCapitalize="none" />
      <label htmlFor="passcode">
        Passcode <span className="hint">(6 to 12 digits)</span>
      </label>
      <input id="passcode" name="passcode" type="password" inputMode="numeric" autoComplete="current-password" required />
      <Status state={state} />
      <SubmitButton className="big">Open care circle</SubmitButton>
    </form>
  );
}

export function SetupForm({ defaultTimeZone }: { defaultTimeZone: string }) {
  const [state, action] = useActionState(createProfile, empty);
  return (
    <form action={action}>
      <fieldset>
        <legend>The person being cared for</legend>
        <label htmlFor="elderName">Their name</label>
        <input id="elderName" name="elderName" required maxLength={80} />
        <label htmlFor="elderEmail">Their email <span className="hint">(reminders go here first)</span></label>
        <input id="elderEmail" name="elderEmail" type="email" required />
        <label htmlFor="timeZone">Time zone</label>
        <input id="timeZone" name="timeZone" defaultValue={defaultTimeZone} required />
      </fieldset>

      <fieldset>
        <legend>Passcodes, one for each role</legend>
        <p className="hint">Different numbers, 6 to 12 digits. Share each one only with that person.</p>
        <label htmlFor="elderPasscode">Elder <span className="hint">(full control)</span></label>
        <input id="elderPasscode" name="elderPasscode" type="password" inputMode="numeric" autoComplete="new-password" required />
        <label htmlFor="caretakerPasscode">Caretaker <span className="hint">(can edit, if the elder allows)</span></label>
        <input id="caretakerPasscode" name="caretakerPasscode" type="password" inputMode="numeric" autoComplete="new-password" required />
        <label htmlFor="familyPasscode">Family <span className="hint">(can view and confirm doses)</span></label>
        <input id="familyPasscode" name="familyPasscode" type="password" inputMode="numeric" autoComplete="new-password" required />
      </fieldset>

      <fieldset>
        <legend>Who else should hear about missed doses?</legend>
        {[0, 1, 2].map((i) => (
          <div className="grid" key={i}>
            <div>
              <label htmlFor={`contactName${i}`}>Name {i + 1}</label>
              <input id={`contactName${i}`} name={`contactName${i}`} maxLength={80} />
            </div>
            <div>
              <label htmlFor={`contactEmail${i}`}>Email {i + 1}</label>
              <input id={`contactEmail${i}`} name={`contactEmail${i}`} type="email" />
            </div>
            <div>
              <label htmlFor={`contactRole${i}`}>Role {i + 1}</label>
              <select id={`contactRole${i}`} name={`contactRole${i}`} defaultValue={i === 0 ? "caretaker" : "family"}>
                <option value="caretaker">Caretaker</option>
                <option value="family">Family</option>
              </select>
            </div>
          </div>
        ))}
      </fieldset>
      <Status state={state} />
      <SubmitButton className="big">Create care circle</SubmitButton>
    </form>
  );
}

const DEFAULT_TIMES = ["08:00", "", "", ""];

export function MedicationForm({
  medication,
  draft,
  today,
}: {
  medication?: Medication;
  draft?: ExtractedMedication;
  today: string;
}) {
  const [state, action] = useActionState(saveMedication, empty);
  const source = medication ?? draft;
  const times = [...(source?.times ?? []), ...DEFAULT_TIMES].slice(0, 4);
  if (!source?.times?.length) times[0] = "08:00";
  const prefix = medication?.id ?? (draft ? `draft-${draft.name}` : "new");

  return (
    <form action={action}>
      {medication && <input type="hidden" name="id" value={medication.id} />}
      <label htmlFor={`${prefix}-name`}>Medicine name</label>
      <input id={`${prefix}-name`} name="name" defaultValue={source?.name} required maxLength={80} />
      <label htmlFor={`${prefix}-dosage`}>Dose</label>
      <input id={`${prefix}-dosage`} name="dosage" defaultValue={source?.dosage} placeholder="500 mg, 1 tablet" required maxLength={60} />
      <label htmlFor={`${prefix}-instructions`}>Instructions <span className="hint">(optional)</span></label>
      <input id={`${prefix}-instructions`} name="instructions" defaultValue={source?.instructions} placeholder="After food" maxLength={300} />
      <fieldset>
        <legend>Times each day</legend>
        <div className="row">
          {times.map((t, i) => (
            <div key={i}>
              <label htmlFor={`${prefix}-time${i}`} className="sr-only">Time {i + 1}</label>
              <input id={`${prefix}-time${i}`} name="times" type="time" defaultValue={t} />
            </div>
          ))}
        </div>
      </fieldset>
      <div className="grid">
        <div>
          <label htmlFor={`${prefix}-start`}>Start date</label>
          <input id={`${prefix}-start`} name="startDate" type="date" defaultValue={medication?.startDate ?? today} required />
        </div>
        <div>
          <label htmlFor={`${prefix}-end`}>End date <span className="hint">(optional)</span></label>
          <input id={`${prefix}-end`} name="endDate" type="date" defaultValue={medication?.endDate} />
        </div>
      </div>
      <Status state={state} />
      <SubmitButton>{medication ? "Save changes" : draft ? "Confirm and add" : "Add medicine"}</SubmitButton>
    </form>
  );
}

export function AppointmentForm({ today }: { today: string }) {
  const [state, action] = useActionState(saveAppointment, empty);
  return (
    <form action={action}>
      <label htmlFor="doctor">Doctor</label>
      <input id="doctor" name="doctor" required maxLength={80} />
      <label htmlFor="purpose">Reason for visit</label>
      <input id="purpose" name="purpose" required maxLength={120} />
      <label htmlFor="location">Where</label>
      <input id="location" name="location" required maxLength={160} />
      <div className="grid">
        <div>
          <label htmlFor="appt-date">Date</label>
          <input id="appt-date" name="date" type="date" min={today} required />
        </div>
        <div>
          <label htmlFor="appt-time">Time</label>
          <input id="appt-time" name="time" type="time" required />
        </div>
      </div>
      <label htmlFor="notes">Notes <span className="hint">(optional: reports to bring, fasting)</span></label>
      <textarea id="notes" name="notes" rows={2} maxLength={500} />
      <Status state={state} />
      <SubmitButton>Add appointment</SubmitButton>
    </form>
  );
}

export function ScanForm({ today }: { today: string }) {
  const [state, action] = useActionState<ScanState, FormData>(scanPrescription, {});
  const [name, setName] = useState("");
  return (
    <div>
      <form action={action}>
        <label htmlFor="photo">Photo of a prescription or medicine label</label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          required
          onChange={(e) => setName(e.target.files?.[0]?.name ?? "")}
        />
        {name && <p className="hint">Selected: {name}</p>}
        <SubmitButton>Read with Gemini</SubmitButton>
      </form>
      <Status state={state} />
      {state.drafts?.map((d, i) => (
        <div className="card" key={`${d.name}-${i}`}>
          <h3>Draft {i + 1}: check before saving</h3>
          <MedicationForm draft={d} today={today} />
        </div>
      ))}
    </div>
  );
}

export function PermissionsForm({ permissions }: { permissions: Permissions }) {
  const [state, action] = useActionState(updatePermissions, empty);
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
      <select id="escalateAfterMinutes" name="escalateAfterMinutes" defaultValue={String(permissions.escalateAfterMinutes)}>
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
