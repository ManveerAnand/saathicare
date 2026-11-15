import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { explain, logDose, removeAppointment, removeMedication, resetDemo, signOut } from "@/app/actions";
import { AppointmentForm, MedicationForm, PermissionsForm, ScanForm } from "@/components/forms";
import { ProgressRing } from "@/components/ProgressRing";
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
// Distinct, AA-contrast colours with white text, so each medicine is recognisable at a glance.
const PILL_COLOURS = ["#15803d", "#b45309", "#1d4ed8", "#9d174d", "#0f766e", "#6d28d9"];

function pillColour(medicationId: string): string {
  let h = 0;
  for (const ch of medicationId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PILL_COLOURS[h % PILL_COLOURS.length];
}

function period(localTime: string): "Morning" | "Afternoon" | "Evening" {
  if (localTime < "12:00") return "Morning";
  return localTime < "17:00" ? "Afternoon" : "Evening";
}

function greeting(now: Date, tz: string): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(now));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

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
  const insights = careInsights({ profile, viewer: session.role, todaysDoses: doses, meds, week, appointments, now });

  const done = doses.filter((d) => d.status === "taken").length;
  const next = doses.find((d) => d.status === "due" || d.status === "upcoming");
  const nextAppt = appointments[0];
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString("en-IN", { timeZone: tz, ...opts });
  const periods = (["Morning", "Afternoon", "Evening"] as const)
    .map((p) => ({ name: p, doses: doses.filter((d) => period(d.localTime) === p) }))
    .filter((p) => p.doses.length);

  return (
    <div className={isElder ? "elder-mode" : undefined}>
      {welcome && (
        <p className="notice ok" role="status">
          Your care circle is ready. Share the care code <strong>{profile.id}</strong> and each person&apos;s passcode.
        </p>
      )}
      {profile.isDemo && (
        <div className="notice info" role="note">
          <p style={{ margin: 0 }}>
            You are exploring the shared demo as <strong>{ROLE_LABEL[session.role].toLowerCase()}</strong>. Try marking a dose,
            or sign out and enter as another role to see how the view changes.{" "}
            <Link href="/tour">Take the 2-minute judges&apos; tour</Link>
          </p>
          <form action={resetDemo} style={{ marginTop: "0.5rem" }}>
            <button type="submit" className="secondary">
              Reset demo data
            </button>
          </form>
        </div>
      )}

      <section className="card summary" aria-labelledby="summary">
        <ProgressRing done={done} total={doses.length} />
        <div>
          <p className="eyebrow">{fmt(now.toISOString(), { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 id="summary">
            {isElder ? `${greeting(now, tz)}, ${profile.elderName.split(" ")[0]}` : `How is ${profile.elderName.split(" ")[0]} doing?`}
          </h1>
          <p className="lead" style={{ margin: 0 }}>
            {doses.length === 0
              ? "No medicines scheduled today."
              : next
                ? `Next: ${next.medicationName} at ${next.localTime}.`
                : "All of today's doses are done."}
          </p>
          <div className="chips">
            <span className="chip role-pill">{ROLE_LABEL[session.role]}</span>
            <span className="chip">This week: {week.percent === null ? "no doses yet" : `${week.percent}% taken`}</span>
            {nextAppt && (
              <span className="chip">
                Next visit: {fmt(nextAppt.at, { weekday: "short", day: "numeric", month: "short" })}
              </span>
            )}
            <span className="chip">Care code {profile.id}</span>
          </div>
        </div>
      </section>

      {insights.length > 0 && (
        <section className="card" aria-labelledby="assistant">
          <h2 id="assistant">Care Assistant</h2>
          <ul className="insights">
            {insights.map((i) => (
              <li key={i.message} className={`insight ${i.level}`}>
                <span className="dot" aria-hidden="true" />
                <span>
                  <span className="sr-only">{i.level}: </span>
                  {i.message}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card" aria-labelledby="today">
        <h2 id="today">Today&apos;s medicines</h2>
        {doses.length === 0 && <p>No medicines scheduled today.{editable && " Add one below."}</p>}
        {periods.map((p) => (
          <div key={p.name}>
            <h3 className="period">{p.name}</h3>
            <ul className="dose-list">
              {p.doses.map((d) => (
                <li className="dose" data-status={d.status} key={`${d.medicationId}-${d.scheduledFor}`}>
                  <span className="pill" style={{ background: pillColour(d.medicationId) }} aria-hidden="true">
                    {d.medicationName.charAt(0)}
                  </span>
                  <div>
                    <div className="row" style={{ gap: "0.5rem" }}>
                      <span className="dose-time">{d.localTime}</span>
                      <span className={`badge ${d.status}`}>{STATUS_LABEL[d.status]}</span>
                    </div>
                    <div className="dose-name">
                      {d.medicationName} <span className="muted">· {d.dosage}</span>
                    </div>
                  </div>
                  {d.status !== "taken" && d.status !== "upcoming" && (
                    <div className="dose-actions">
                      <form action={logDose}>
                        <input type="hidden" name="medicationId" value={d.medicationId} />
                        <input type="hidden" name="scheduledFor" value={d.scheduledFor} />
                        <input type="hidden" name="status" value="taken" />
                        <button type="submit" aria-label={`Mark ${d.medicationName} at ${d.localTime} as taken`}>
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
          </div>
        ))}
      </section>

      <div className="grid">
        <section className="card" aria-labelledby="adherence">
          <h2 id="adherence">The last 7 days</h2>
          <p className="stat">{week.percent === null ? "–" : `${week.percent}%`}</p>
          <p className="muted">
            {week.taken} taken · {week.missed} missed · {week.skipped} skipped
          </p>
          <div className="trend" role="img" aria-label={trendLabel(week.daily)}>
            {week.daily.map((d) => (
              <div className="trend-col" key={d.date}>
                <div
                  className={`trend-bar${d.percent === null ? " empty" : d.percent < 80 ? " low" : ""}`}
                  style={{ height: `${Math.max(d.percent ?? 0, 6)}%` }}
                />
                <span className="trend-day" aria-hidden="true">
                  {new Date(`${d.date}T12:00:00Z`).toLocaleDateString("en-IN", { weekday: "narrow" })}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="appointments">
          <div className="visit-link">
            <h2 id="appointments" style={{ margin: 0 }}>
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
                <strong>{fmt(a.at, { day: "numeric" })}</strong>
                <span>{fmt(a.at, { month: "short" })}</span>
              </div>
              <div>
                <strong>{a.doctor}</strong>
                <div>
                  {fmt(a.at, { weekday: "long", hour: "numeric", minute: "2-digit" })} · {a.purpose}
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
      </div>

      <section className="card" aria-labelledby="medicines">
        <h2 id="medicines">Medicines</h2>
        {meds.length === 0 && <p>No medicines yet.</p>}
        <div className="grid">
          {meds.map((m) => (
            <article key={m.id} className="card flat" style={{ marginBottom: 0 }}>
              <div className="row">
                <span className="pill" style={{ background: pillColour(m.id) }} aria-hidden="true">
                  {m.name.charAt(0)}
                </span>
                <div>
                  <h3 style={{ margin: 0 }}>{m.name}</h3>
                  <div className="muted">
                    {m.dosage} · {m.times.join(", ")}
                    {m.endDate && ` · until ${m.endDate}`}
                  </div>
                </div>
              </div>
              {m.instructions && <p style={{ marginTop: "0.6rem" }}>{m.instructions}</p>}
              {m.explanation ? (
                <p className="notice info">
                  <span className="sr-only">What this medicine is for: </span>
                  {m.explanation}
                </p>
              ) : (
                geminiConfigured() && (
                  <form action={explain}>
                    <input type="hidden" name="id" value={m.id} />
                    <button type="submit" className="secondary">
                      What is this for?
                    </button>
                  </form>
                )
              )}
              {editable && (
                <details>
                  <summary>Edit {m.name}</summary>
                  <MedicationForm medication={m} today={today} />
                  <form action={removeMedication}>
                    <input type="hidden" name="id" value={m.id} />
                    <button type="submit" className="danger">
                      Stop this medicine
                    </button>
                  </form>
                </details>
              )}
            </article>
          ))}
        </div>
        {editable ? (
          <div className="grid" style={{ marginTop: "0.5rem" }}>
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
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            {profile.elderName} has chosen who can change medicines. You can still confirm doses.
          </p>
        )}
      </section>

      {canManageAccess(session.role) && (
        <section className="card" aria-labelledby="choices">
          <h2 id="choices">Your choices</h2>
          <p>You decide who can change your care plan, and when others are told about a missed dose.</p>
          <PermissionsForm permissions={profile.permissions} />
        </section>
      )}

      <form action={signOut} style={{ textAlign: "right" }}>
        <button type="submit" className="secondary">
          Sign out
        </button>
      </form>
    </div>
  );
}

function trendLabel(daily: { date: string; percent: number | null }[]): string {
  return `Doses taken per day: ${daily.map((d) => `${d.date} ${d.percent === null ? "none" : `${d.percent}%`}`).join(", ")}`;
}
