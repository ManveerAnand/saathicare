import type { Dose, DoseLog, Medication } from "./types";
import { addDays, localDate, zonedToUtc } from "./time";

/** A dose is "due" from this long before its time until it counts as missed. */
export const DUE_WINDOW_MINUTES = 30;
/** After this long without a log, a dose counts as missed. */
export const MISSED_AFTER_MINUTES = 60;

const MINUTE = 60_000;

function activeOn(med: Medication, date: string): boolean {
  return med.active && med.startDate <= date && (!med.endDate || date <= med.endDate);
}

/** Every scheduled dose on one local date, with its status at `now`, sorted by time. */
export function dosesForDate(meds: Medication[], logs: DoseLog[], date: string, timeZone: string, now: Date): Dose[] {
  const logByKey = new Map(logs.map((l) => [`${l.medicationId}|${l.scheduledFor}`, l]));
  const doses: Dose[] = [];

  for (const med of meds) {
    if (!activeOn(med, date)) continue;
    for (const time of new Set(med.times)) {
      const at = zonedToUtc(date, time, timeZone);
      const scheduledFor = at.toISOString();
      const log = logByKey.get(`${med.id}|${scheduledFor}`);
      doses.push({
        medicationId: med.id,
        medicationName: med.name,
        dosage: med.dosage,
        scheduledFor,
        localTime: time,
        status: log ? log.status : statusAt(at, now),
      });
    }
  }
  return doses.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}

function statusAt(at: Date, now: Date): Dose["status"] {
  const diff = (now.getTime() - at.getTime()) / MINUTE;
  if (diff >= MISSED_AFTER_MINUTES) return "missed";
  if (diff >= -DUE_WINDOW_MINUTES) return "due";
  return "upcoming";
}

export interface Adherence {
  taken: number;
  missed: number;
  skipped: number;
  /** Taken out of all doses that are already decided, 0-100, or null if none yet. */
  percent: number | null;
  /** One entry per day, oldest first, for the trend strip. */
  daily: { date: string; percent: number | null }[];
}

/** Adherence over the `days` local days ending today. Upcoming and due doses are ignored. */
export function adherence(meds: Medication[], logs: DoseLog[], timeZone: string, now: Date, days = 7): Adherence {
  const today = localDate(now, timeZone);
  let taken = 0;
  let missed = 0;
  let skipped = 0;
  const daily: Adherence["daily"] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const doses = dosesForDate(meds, logs, date, timeZone, now);
    const t = doses.filter((d) => d.status === "taken").length;
    const m = doses.filter((d) => d.status === "missed").length;
    const s = doses.filter((d) => d.status === "skipped").length;
    taken += t;
    missed += m;
    skipped += s;
    const decided = t + m + s;
    daily.push({ date, percent: decided ? Math.round((t / decided) * 100) : null });
  }

  const decided = taken + missed + skipped;
  return {
    taken,
    missed,
    skipped,
    percent: decided ? Math.round((taken / decided) * 100) : null,
    daily,
  };
}
