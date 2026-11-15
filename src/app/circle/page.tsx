import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { explain, logDose, removeAppointment, removeMedication, signOut } from "@/app/actions";
import { AppointmentForm, MedicationForm, PermissionsForm, ScanForm } from "@/components/forms";
import { geminiConfigured } from "@/lib/ai/gemini";
import { careInsights } from "@/lib/domain/assistant";
import { canEdit, canManageAccess } from "@/lib/domain/permissions";
import { adherence, dosesForDate } from "@/lib/domain/schedule";
import { addDays, localDate, zonedToUtc } from "@/lib/domain/time";
import type { Dose, Role } from "@/lib/domain/types";
import { currentSession, repo } from "@/lib/server";

export const metadata: Metadata = { title: "Care circle | SaathiCare" };

const ROLE_LABEL: Record<Role, string> = { elder: "Elder", caretaker: "Caretaker", family: "Family" };
const STATUS_LABEL: Record<Dose["status"], string> = {
  taken: "Taken",
  skipped: "Skipped",
  due: "Due now",
  missed: "Missed",
  upcoming: "Later",
};

export default async function CirclePage({ searchParams }: PageProps<"/circle">) {
  const session = await currentSession();
  if (!session) redirect("/");
  const profile = await repo().getProfile(session.profileId);
  if (!profile) redirect("/");

  const now = new Date();
  const tz = profile.timeZone;
  const today = localDate(now, tz);
  const weekStart = zonedToUtc(addDays(today, -6), "00:00", tz).toISOString();

  const [meds, logs, appointments] = await Promise.all([
    repo().listMedications(profile.id),
    repo().listDoseLogs(profile.id, weekStart),
    repo().listAppointments(profile.id, now.toISOString()),
  ]);
  const doses = dosesForDate(meds, logs, today, tz, now);
  const week = adherence(meds, logs, tz, now, 7);
  const editable = canEdit(profile, session.role);
  const isElder = session.role === "elder";
  const welcome = (await searchParams).welcome;
  const attention = doses.filter((d) => d.status === "due" || d.status === "missed").length;
  const insights = careInsights({ profile, viewer: session.role, todaysDoses: doses, meds, week, appointments, now });

  return (
    <div className={isElder ? "elder-mode" : undefined}>
      <div className="row spread">
        <h1>
          {isElder ? `Good day, ${profile.elderName}` : `${profile.elderName}'s care circle`}
        </h1>
        <form action={signOut}>
          <button type="submit" className="secondary">Sign out</button>
        </form>
      </div>
      <p className="muted">
        Signed in as <strong>{ROLE_LABEL[session.role]}</strong> · Care code <strong>{profile.id}</strong>
      </p>

      {welcome && (
        <p className="notice ok" role="status">
          Care circle created. Share the care code <strong>{profile.id}</strong> and each person&apos;s passcode.
        </p>
      )}

      {insights.length > 0 && (
        <section className="card" aria-labelledby="assistant">
          <h2 id="assistant">Care Assistant</h2>
          <ul className="insights">
            {insights.map((i) => (
              <li key={i.message} className={`insight ${i.level}`}>
                <span className="sr-only">{i.level}: </span>
                {i.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card" aria-labelledby="today">
        <div className="row spread">
          <h2 id="today">Today&apos;s medicines</h2>
          <p className="muted" aria-live="polite">
            {attention ? `${attention} need attention` : "All caught up"}
          </p>
        </div>
        {doses.length === 0 ? (
          <p>No medicines scheduled today.{editable && " Add one below."}</p>
        ) : (
          <ul className="dose-list">
            {doses.map((d) => (
              <li className="dose" data-status={d.status} key={`${d.medicationId}-${d.scheduledFor}`}>
                <div className="row">
                  <span className="dose-time">{d.localTime}</span>
                  <div>
                    <div className="dose-name">{d.medicationName}</div>
                    <div className="muted">{d.dosage}</div>
                  </div>
                  <span className={`badge ${d.status}`}>{STATUS_LABEL[d.status]}</span>
                </div>
                {d.status !== "taken" && d.status !== "upcoming" && (
                  <div className="row">
                    <form action={logDose}>
                      <input type="hidden" name="medicationId" value={d.medicationId} />
                      <input type="hidden" name="scheduledFor" value={d.scheduledFor} />
                      <input type="hidden" name="status" value="taken" />
                      <button type="submit" className="big" aria-label={`Mark ${d.medicationName} at ${d.localTime} as taken`}>
                        ✓ Taken
                      </button>
                    </form>
                    {d.status !== "skipped" && (
                      <form action={logDose}>
                        <input type="hidden" name="medicationId" value={d.medicationId} />
                        <input type="hidden" name="scheduledFor" value={d.scheduledFor} />
                        <input type="hidden" name="status" value="skipped" />
                        <button type="submit" className="secondary" aria-label={`Skip ${d.medicationName} at ${d.localTime}`}>
                          Skip
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid">
        <section className="card" aria-labelledby="adherence">
          <h2 id="adherence">Last 7 days</h2>
          <p className="stat">{week.percent === null ? "-" : `${week.percent}%`}</p>
          <p className="muted">
            {week.taken} taken · {week.missed} missed · {week.skipped} skipped
          </p>
          <div className="trend" role="img" aria-label={trendLabel(week.daily)}>
            {week.daily.map((d) => (
              <div
                key={d.date}
                className={`trend-bar${d.percent === null ? " empty" : ""}`}
                style={{ height: `${Math.max(d.percent ?? 0, 6)}%` }}
                title={`${d.date}: ${d.percent === null ? "no doses" : `${d.percent}%`}`}
              />
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="appointments">
          <h2 id="appointments">Upcoming appointments</h2>
          {appointments.length === 0 ? (
            <p>No upcoming appointments.</p>
          ) : (
            <ul>
              {appointments.map((a) => (
                <li key={a.id}>
                  <strong>
                    {new Date(a.at).toLocaleString("en-IN", { timeZone: tz, dateStyle: "medium", timeStyle: "short" })}
                  </strong>{" "}
                  · {a.doctor}: {a.purpose}, {a.location}
                  {a.notes && <div className="muted">{a.notes}</div>}
                  {editable && (
                    <form action={removeAppointment}>
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" className="danger" aria-label={`Remove appointment with ${a.doctor}`}>
                        Remove
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <details>
              <summary>Add an appointment</summary>
              <AppointmentForm today={today} />
            </details>
          )}
        </section>
      </div>

      <section className="card" aria-labelledby="medicines">
        <h2 id="medicines">Medicines</h2>
        {meds.length === 0 && <p>No medicines yet.</p>}
        {meds.map((m) => (
          <article key={m.id} className="card">
            <div className="row spread">
              <h3>
                {m.name} <span className="muted">· {m.dosage}</span>
              </h3>
              <span className="muted">{m.times.join(", ")}</span>
            </div>
            {m.instructions && <p>{m.instructions}</p>}
            {m.explanation ? (
              <p className="notice info">
                <span className="sr-only">What this medicine is for: </span>
                {m.explanation}
              </p>
            ) : (
              geminiConfigured() && (
                <form action={explain}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className="secondary">What is this for?</button>
                </form>
              )
            )}
            {editable && (
              <details>
                <summary>Edit {m.name}</summary>
                <MedicationForm medication={m} today={today} />
                <form action={removeMedication}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className="danger">Stop this medicine</button>
                </form>
              </details>
            )}
          </article>
        ))}
        {editable ? (
          <div className="grid">
            <details>
              <summary>Add a medicine by hand</summary>
              <MedicationForm today={today} />
            </details>
            {geminiConfigured() && (
              <details>
                <summary>Add from a prescription photo</summary>
                <ScanForm today={today} />
              </details>
            )}
          </div>
        ) : (
          <p className="muted">{profile.elderName} has chosen who can change medicines. You can still confirm doses.</p>
        )}
      </section>

      {canManageAccess(session.role) && (
        <section className="card" aria-labelledby="choices">
          <h2 id="choices">Your choices</h2>
          <p>You decide who can change your care plan, and when others are told about a missed dose.</p>
          <PermissionsForm permissions={profile.permissions} />
        </section>
      )}
    </div>
  );
}

function trendLabel(daily: { date: string; percent: number | null }[]): string {
  return `Doses taken per day: ${daily.map((d) => `${d.date} ${d.percent === null ? "none" : `${d.percent}%`}`).join(", ")}`;
}
