import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { addDays, localDate, zonedToUtc } from "@/lib/domain/time";
import { buildVisitSummary } from "@/lib/domain/visitSummary";
import { formatCalendarDate, formatInZone } from "@/lib/presentation";
import { currentSession, repo } from "@/lib/server";

export const metadata: Metadata = { title: "Doctor visit summary | SaathiCare" };

const DAYS = 30;

/** Builds a printable report from the circle's last 30 days of care. */
export default async function VisitSummaryPage() {
  const session = await currentSession();
  if (!session) redirect("/");
  const profile = await repo().getProfile(session.profileId);
  if (!profile) redirect("/");

  const now = new Date();
  const tz = profile.timeZone;
  const since = zonedToUtc(addDays(localDate(now, tz), -(DAYS - 1)), "00:00", tz).toISOString();
  const [meds, logs, appointments] = await Promise.all([
    repo().listMedications(profile.id),
    repo().listDoseLogs(profile.id, since),
    repo().listAppointments(profile.id, now.toISOString()),
  ]);
  const s = buildVisitSummary(profile, meds, logs, appointments, now, DAYS);
  const fmtDate = (d: string) => formatCalendarDate(d, { day: "numeric", month: "short", year: "numeric" });
  const appt = s.nextAppointment;

  return (
    <article className="visit">
      <div className="row spread no-print">
        <Link href="/circle">← Back to the care circle</Link>
        <PrintButton />
      </div>

      <header className="visit-head">
        <p className="eyebrow">Doctor visit summary</p>
        <h1>{profile.elderName}</h1>
        <p className="muted">
          Doses from {fmtDate(s.from)} to {fmtDate(s.to)} ({s.days} days) · Prepared with SaathiCare on {fmtDate(s.to)}
        </p>
        {appt && (
          <p>
            <strong>Visit:</strong> {appt.doctor},{" "}
            {formatInZone(appt.at, tz, { dateStyle: "medium", timeStyle: "short" })} · {appt.purpose}
            {appt.notes && ` · ${appt.notes}`}
          </p>
        )}
      </header>

      <section className="card" aria-labelledby="overall">
        <h2 id="overall">Overall</h2>
        <p className="stat">
          {s.overallPercent === null ? "No doses recorded yet" : `${s.overallPercent}% of doses taken`}
        </p>
      </section>

      <section className="card" aria-labelledby="meds">
        <h2 id="meds">Current medicines</h2>
        {s.medications.length === 0 ? (
          <p>No medicines recorded.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <caption className="sr-only">Medicines with dose, times and how reliably they were taken</caption>
              <thead>
                <tr>
                  <th scope="col">Medicine</th>
                  <th scope="col">Dose and times</th>
                  <th scope="col">Taken</th>
                  <th scope="col">Missed</th>
                  <th scope="col">Skipped</th>
                  <th scope="col">Hardest time</th>
                </tr>
              </thead>
              <tbody>
                {s.medications.map((m) => (
                  <tr key={m.id}>
                    <th scope="row">
                      {m.name}
                      {m.instructions && <div className="muted">{m.instructions}</div>}
                    </th>
                    <td>
                      {m.dosage}
                      <div className="muted">{m.times.join(", ")}</div>
                    </td>
                    <td>
                      <strong>{m.percent === null ? "–" : `${m.percent}%`}</strong>
                      <div className="muted">{m.taken} doses</div>
                    </td>
                    <td>{m.missed}</td>
                    <td>{m.skipped}</td>
                    <td>{m.hardestTime ? `${m.hardestTime.time} (${m.hardestTime.missed}×)` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid">
        <section className="card" aria-labelledby="patterns">
          <h2 id="patterns">What the record shows</h2>
          {s.patterns.length ? (
            <ul>
              {s.patterns.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : (
            <p>Not enough history yet.</p>
          )}
        </section>

        <section className="card" aria-labelledby="questions">
          <h2 id="questions">Questions to ask</h2>
          <ol className="questions">
            {s.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
            <li className="write-in">&nbsp;</li>
            <li className="write-in">&nbsp;</li>
          </ol>
        </section>
      </div>

      <section className="card" aria-labelledby="notes">
        <h2 id="notes">Doctor&apos;s notes</h2>
        <div className="note-lines" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </section>

      <p className="muted">
        This summary lists what was recorded in SaathiCare. It is not medical advice. Please review all medicines with
        the doctor.
      </p>
    </article>
  );
}
