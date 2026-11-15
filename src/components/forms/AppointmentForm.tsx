"use client";

import { useActionState } from "react";
import { saveAppointment } from "@/app/actions/carePlan";
import { emptyState, Status } from "./Status";
import { SubmitButton } from "./SubmitButton";

export function AppointmentForm({ today }: { today: string }) {
  const [state, action] = useActionState(saveAppointment, emptyState);
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
