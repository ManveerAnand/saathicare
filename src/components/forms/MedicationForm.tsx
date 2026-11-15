"use client";

import { useActionState, useId } from "react";
import { saveMedication } from "@/app/actions/carePlan";
import type { Medication } from "@/lib/domain/types";
import type { ExtractedMedication } from "@/lib/validation";
import { emptyState, fieldError, Status } from "./Status";
import { SubmitButton } from "./SubmitButton";

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
  const errorId = useId();
  const { values } = state;
  const source = medication ?? draft;
  const initialTimes = values?.times?.split(",") ?? source?.times ?? ["08:00"];
  const times = Array.from({ length: Math.max(4, initialTimes.length) }, (_, i) => initialTimes[i] ?? "");
  const prefix = medication?.id ?? (draft ? `draft-${draft.name}` : "new");

  return (
    <form action={action} key={state.errorCount ?? 0}>
      {medication && <input type="hidden" name="id" defaultValue={values?.id ?? medication.id} />}
      <label htmlFor={`${prefix}-name`}>Medicine name</label>
      <input
        id={`${prefix}-name`}
        name="name"
        {...fieldError(state, "name", errorId)}
        defaultValue={values?.name ?? source?.name}
        required
        maxLength={80}
      />
      <label htmlFor={`${prefix}-dosage`}>Dose</label>
      <input
        id={`${prefix}-dosage`}
        name="dosage"
        {...fieldError(state, "dosage", errorId)}
        defaultValue={values?.dosage ?? source?.dosage}
        placeholder="500 mg, 1 tablet"
        required
        maxLength={60}
      />
      <label htmlFor={`${prefix}-instructions`}>
        Instructions <span className="hint">(optional)</span>
      </label>
      <input
        id={`${prefix}-instructions`}
        name="instructions"
        {...fieldError(state, "instructions", errorId)}
        defaultValue={values?.instructions ?? source?.instructions}
        placeholder="After food"
        maxLength={300}
      />
      <fieldset {...fieldError(state, "times", errorId)}>
        <legend>Times each day</legend>
        <div className="row">
          {times.map((t, i) => (
            <div key={i}>
              <label htmlFor={`${prefix}-time${i}`} className="sr-only">
                Time {i + 1}
              </label>
              <input id={`${prefix}-time${i}`} name="times" type="time" defaultValue={t} />
            </div>
          ))}
        </div>
      </fieldset>
      <div className="grid">
        <div>
          <label htmlFor={`${prefix}-start`}>Start date</label>
          <input
            id={`${prefix}-start`}
            name="startDate"
            {...fieldError(state, "startDate", errorId)}
            type="date"
            defaultValue={values?.startDate ?? medication?.startDate ?? today}
            required
          />
        </div>
        <div>
          <label htmlFor={`${prefix}-end`}>
            End date <span className="hint">(optional)</span>
          </label>
          <input
            id={`${prefix}-end`}
            name="endDate"
            {...fieldError(state, "endDate", errorId)}
            type="date"
            defaultValue={values?.endDate ?? medication?.endDate}
          />
        </div>
      </div>
      <Status state={state} errorId={errorId} />
      <SubmitButton>{medication ? "Save changes" : draft ? "Confirm and add" : "Add medicine"}</SubmitButton>
    </form>
  );
}
