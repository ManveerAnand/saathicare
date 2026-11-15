import type { Dose } from "@/lib/domain/types";
import { period, PERIODS } from "@/lib/presentation";
import { DoseCard } from "./DoseCard";

/** Today's doses, grouped into morning, afternoon and evening. */
export function DoseTimeline({ doses, editable }: { doses: Dose[]; editable: boolean }) {
  const groups = PERIODS.map((name) => ({ name, doses: doses.filter((d) => period(d.localTime) === name) })).filter(
    (g) => g.doses.length,
  );

  return (
    <section className="card" aria-labelledby="today">
      <h2 id="today">Today&apos;s medicines</h2>
      {doses.length === 0 && <p>No medicines scheduled today.{editable && " Add one below."}</p>}
      {groups.map((g) => (
        <div key={g.name}>
          <h3 className="period">{g.name}</h3>
          <ul className="dose-list">
            {g.doses.map((d) => (
              <DoseCard key={`${d.medicationId}-${d.scheduledFor}`} dose={d} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
