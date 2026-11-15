"use client";

import { useActionState } from "react";
import { saveMedication } from "@/app/actions/carePlan";
import type { Medication } from "@/lib/domain/types";
import type { ExtractedMedication } from "@/lib/validation";
import { emptyState, Status } from "./Status";
import { SubmitButton } from "./SubmitButton";

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
  const [state, action] = useActionState(saveMedication, emptyState);
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
