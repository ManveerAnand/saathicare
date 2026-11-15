/** Display helpers shared by the dashboard and the visit summary. Pure: no framework or I/O. */
import type { Dose, Role } from "@/lib/domain/types";

export const ROLE_LABEL: Record<Role, string> = { elder: "Elder", caretaker: "Caretaker", family: "Family" };

export const STATUS_LABEL: Record<Dose["status"], string> = {
  taken: "Taken",
  skipped: "Skipped",
  due: "Due now",
  missed: "Missed",
  upcoming: "Later",
};

export const PERIODS = ["Morning", "Afternoon", "Evening"] as const;
export type Period = (typeof PERIODS)[number];

// Distinct, AA-contrast colours with white text, so each medicine is recognisable at a glance.
export const PILL_COLOURS = ["#15803d", "#b45309", "#1d4ed8", "#9d174d", "#0f766e", "#6d28d9"];

/** A stable colour for a medicine, derived from its id. */
export function pillColour(medicationId: string): string {
  let h = 0;
  for (const ch of medicationId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PILL_COLOURS[h % PILL_COLOURS.length];
}

/** The part of the day a local "HH:MM" time falls in. */
export function period(localTime: string): Period {
  if (localTime < "12:00") return "Morning";
  return localTime < "17:00" ? "Afternoon" : "Evening";
}

/** "Good morning", "Good afternoon" or "Good evening" for the hour in `tz`. */
export function greeting(now: Date, tz: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(now),
  );
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** Formats an instant in the elder's time zone, in Indian English. */
export function formatInZone(iso: string, tz: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleString("en-IN", { timeZone: tz, ...options });
}

/** Formats a calendar date ("YYYY-MM-DD"); noon UTC keeps it on the same day in any zone. */
export function formatCalendarDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-IN", options);
}

/** Text alternative for the 7-day trend chart. */
export function trendLabel(daily: { date: string; percent: number | null }[]): string {
  return `Doses taken per day: ${daily.map((d) => `${d.date} ${d.percent === null ? "none" : `${d.percent}%`}`).join(", ")}`;
}
