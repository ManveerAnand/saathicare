import { dosesForDate } from "./schedule";
import { addDays, localDate } from "./time";
import type { Appointment, DoseLog, Medication, Profile } from "./types";

export interface MedicationReport {
  id: string;
  name: string;
  dosage: string;
  times: string[];
  instructions: string;
  taken: number;
  missed: number;
  skipped: number;
  /** Taken out of decided doses, or null when none are decided yet. */
  percent: number | null;
  /** The dose time missed most often, if any dose was missed. */
  hardestTime: { time: string; missed: number } | null;
}

export interface VisitSummary {
  from: string;
  to: string;
  days: number;
  overallPercent: number | null;
  medications: MedicationReport[];
  /** Plain-language observations the doctor can act on. */
  patterns: string[];
  /** Questions worth asking, drafted from the data. */
  questions: string[];
  nextAppointment: Appointment | null;
}

const MIN_DOSES_FOR_PATTERN = 2;
const LOW_PERCENT = 80;
const COURSE_ENDING_DAYS = 7;

function percent(taken: number, decided: number): number | null {
  return decided ? Math.round((taken / decided) * 100) : null;
}

function partOfDay(time: string): "morning" | "afternoon" | "evening" {
  if (time < "12:00") return "morning";
  return time < "17:00" ? "afternoon" : "evening";
}

/**
 * A one-page summary for the next doctor visit: what is taken, how reliably, where the
 * routine breaks down, and questions to ask. Deterministic, so the doctor sees facts, not AI guesses.
 */
export function buildVisitSummary(
  profile: Profile,
  meds: Medication[],
  logs: DoseLog[],
  appointments: Appointment[],
  now: Date,
  days = 30,
): VisitSummary {
  const tz = profile.timeZone;
  const today = localDate(now, tz);
  const from = addDays(today, -(days - 1));

  const byMed = new Map<string, { taken: number; missed: number; skipped: number; missedAt: Map<string, number> }>();
  const missedByPart = { morning: 0, afternoon: 0, evening: 0 };
  for (const med of meds) byMed.set(med.id, { taken: 0, missed: 0, skipped: 0, missedAt: new Map() });

  for (let i = days - 1; i >= 0; i--) {
    for (const dose of dosesForDate(meds, logs, addDays(today, -i), tz, now)) {
      const m = byMed.get(dose.medicationId);
      if (!m) continue;
      if (dose.status === "taken") m.taken += 1;
      else if (dose.status === "skipped") m.skipped += 1;
      else if (dose.status === "missed") {
        m.missed += 1;
        m.missedAt.set(dose.localTime, (m.missedAt.get(dose.localTime) ?? 0) + 1);
        missedByPart[partOfDay(dose.localTime)] += 1;
      }
    }
  }

  const medications: MedicationReport[] = meds.map((med) => {
    const m = byMed.get(med.id)!;
    const worst = [...m.missedAt.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    return {
      id: med.id,
      name: med.name,
      dosage: med.dosage,
      times: med.times,
      instructions: med.instructions,
      taken: m.taken,
      missed: m.missed,
      skipped: m.skipped,
      percent: percent(m.taken, m.taken + m.missed + m.skipped),
      hardestTime: worst ? { time: worst[0], missed: worst[1] } : null,
    };
  });

  const totals = medications.reduce(
    (t, m) => ({ taken: t.taken + m.taken, decided: t.decided + m.taken + m.missed + m.skipped }),
    { taken: 0, decided: 0 },
  );

  const patterns: string[] = [];
  const questions: string[] = [];
  const totalMissed = missedByPart.morning + missedByPart.afternoon + missedByPart.evening;

  if (totalMissed >= MIN_DOSES_FOR_PATTERN) {
    const [part, count] = (Object.entries(missedByPart) as [keyof typeof missedByPart, number][]).sort(
      (a, b) => b[1] - a[1],
    )[0];
    if (count / totalMissed >= 0.5) {
      patterns.push(`Most missed doses are in the ${part}: ${count} of ${totalMissed}.`);
      questions.push(`Could ${part} doses be moved to a time that is easier to remember?`);
    }
  }

  for (const m of medications) {
    if (m.hardestTime && m.hardestTime.missed >= MIN_DOSES_FOR_PATTERN) {
      patterns.push(`${m.name} at ${m.hardestTime.time} was missed ${m.hardestTime.missed} times.`);
    }
    if (m.percent !== null && m.percent < LOW_PERCENT && m.taken + m.missed + m.skipped >= MIN_DOSES_FOR_PATTERN) {
      questions.push(
        `${m.name} was taken ${m.percent}% of the time. Is it still needed, or is there a simpler schedule?`,
      );
    }
    if (m.skipped >= MIN_DOSES_FOR_PATTERN) {
      patterns.push(`${m.name} was deliberately skipped ${m.skipped} times.`);
      questions.push(`Why might ${m.name} be skipped (side effects, cost, confusion)?`);
    }
  }

  for (const med of meds) {
    if (med.endDate && med.endDate >= today && med.endDate <= addDays(today, COURSE_ENDING_DAYS)) {
      questions.push(`${med.name} is planned to end on ${med.endDate}. Should it continue?`);
    }
  }

  if (meds.length >= 5) questions.push(`With ${meds.length} medicines, can any be combined or stopped?`);
  if (patterns.length === 0 && totals.decided > 0)
    patterns.push("No worrying patterns: doses are being taken regularly.");

  return {
    from,
    to: today,
    days,
    overallPercent: percent(totals.taken, totals.decided),
    medications,
    patterns,
    questions,
    nextAppointment: appointments[0] ?? null,
  };
}
