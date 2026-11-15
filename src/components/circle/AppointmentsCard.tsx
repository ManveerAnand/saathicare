import Link from "next/link";
import { removeAppointment } from "@/app/actions/carePlan";
import { AppointmentForm } from "@/components/forms";
import type { Appointment } from "@/lib/domain/types";
import { formatInZone } from "@/lib/presentation";

interface Props {
  appointments: Appointment[];
  tz: string;
  today: string;
  editable: boolean;
}

/** Upcoming doctor visits, with a link to the visit summary and, for editors, add and remove. */
export function AppointmentsCard({ appointments, tz, today, editable }: Props) {
  return (
    <section className="card" aria-labelledby="appointments">
      <div className="visit-link">
        <h2 id="appointments" className="flush">
          Upcoming visits
        </h2>
        <Link className="button secondary" href="/circle/visit">
          Prepare for the doctor
        </Link>
      </div>
      {appointments.length === 0 && <p>No upcoming appointments.</p>}
      {appointments.map((a) => (
        <div className="appt" key={a.id}>
          <div className="date-tile" aria-hidden="true">
            <strong>{formatInZone(a.at, tz, { day: "numeric" })}</strong>
            <span>{formatInZone(a.at, tz, { month: "short" })}</span>
          </div>
          <div>
            <strong>{a.doctor}</strong>
            <div>
              {formatInZone(a.at, tz, { weekday: "long", hour: "numeric", minute: "2-digit" })} · {a.purpose}
            </div>
            <div className="muted">{a.location}</div>
            {a.notes && <div className="muted">Note: {a.notes}</div>}
            {editable && (
              <form action={removeAppointment}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="ghost" aria-label={`Remove appointment with ${a.doctor}`}>
                  Remove
                </button>
              </form>
            )}
          </div>
        </div>
      ))}
      {editable && (
        <details>
          <summary>Add an appointment</summary>
          <AppointmentForm today={today} />
        </details>
      )}
    </section>
  );
}
