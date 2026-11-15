"use client";

import { useActionState, useId } from "react";
import { saveAppointment } from "@/app/actions/carePlan";
import { emptyState, fieldError, Status } from "./Status";
import { SubmitButton } from "./SubmitButton";

/** Collects the date, location and notes for a doctor visit. */
export function AppointmentForm({ today }: { today: string }) {
  const [state, action] = useActionState(saveAppointment, emptyState);
  const errorId = useId();
  const { values } = state;
  return (
    <form action={action} key={state.errorCount ?? 0}>
      <label htmlFor="doctor">Doctor</label>
      <input
        id="doctor"
        name="doctor"
        {...fieldError(state, "doctor", errorId)}
        defaultValue={values?.doctor}
        required
        maxLength={80}
      />
      <label htmlFor="purpose">Reason for visit</label>
      <input
        id="purpose"
        name="purpose"
        {...fieldError(state, "purpose", errorId)}
        defaultValue={values?.purpose}
        required
        maxLength={120}
      />
      <label htmlFor="location">Where</label>
      <input
        id="location"
        name="location"
        {...fieldError(state, "location", errorId)}
        defaultValue={values?.location}
        required
        maxLength={160}
      />
      <div className="grid">
        <div>
          <label htmlFor="appt-date">Date</label>
          <input
            id="appt-date"
            name="date"
            type="date"
            {...fieldError(state, "date", errorId)}
            defaultValue={values?.date}
            min={today}
            required
          />
        </div>
        <div>
          <label htmlFor="appt-time">Time</label>
          <input
            id="appt-time"
            name="time"
            type="time"
            {...fieldError(state, "time", errorId)}
            defaultValue={values?.time}
            required
          />
        </div>
      </div>
      <label htmlFor="notes">
        Notes <span className="hint">(optional: reports to bring, fasting)</span>
      </label>
      <textarea
        id="notes"
        name="notes"
        {...fieldError(state, "notes", errorId)}
        defaultValue={values?.notes}
        rows={2}
        maxLength={500}
      />
      <Status state={state} errorId={errorId} />
      <SubmitButton>Add appointment</SubmitButton>
    </form>
  );
}
