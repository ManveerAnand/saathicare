import { ProgressRing } from "@/components/ProgressRing";
import type { Adherence } from "@/lib/domain/schedule";
import type { Appointment, Dose, Profile, Role } from "@/lib/domain/types";
import { formatInZone, greeting, ROLE_LABEL } from "@/lib/presentation";

interface Props {
  profile: Profile;
  role: Role;
  now: Date;
  doses: Dose[];
  week: Adherence;
  nextAppointment?: Appointment;
}

/** Today at a glance: the progress ring, a headline, and a few facts as chips. */
export function CareSummary({ profile, role, now, doses, week, nextAppointment }: Props) {
  const tz = profile.timeZone;
  const firstName = profile.elderName.split(" ")[0];
  const done = doses.filter((d) => d.status === "taken").length;
  const next = doses.find((d) => d.status === "due" || d.status === "upcoming");

  return (
    <section className="card summary" aria-labelledby="summary">
      <ProgressRing done={done} total={doses.length} />
      <div>
        <p className="eyebrow">
          {formatInZone(now.toISOString(), tz, { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 id="summary">{role === "elder" ? `${greeting(now, tz)}, ${firstName}` : `How is ${firstName} doing?`}</h1>
        <p className="lead flush">
          {doses.length === 0
            ? "No medicines scheduled today."
            : next
              ? `Next: ${next.medicationName} at ${next.localTime}.`
              : "All of today's doses are done."}
        </p>
        <div className="chips">
          <span className="chip role-pill">{ROLE_LABEL[role]}</span>
          <span className="chip">This week: {week.percent === null ? "no doses yet" : `${week.percent}% taken`}</span>
          {nextAppointment && (
            <span className="chip">
              Next visit: {formatInZone(nextAppointment.at, tz, { weekday: "short", day: "numeric", month: "short" })}
            </span>
          )}
          <span className="chip">Care code {profile.id}</span>
        </div>
      </div>
    </section>
  );
}
