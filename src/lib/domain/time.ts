/**
 * Time-zone helpers built on Intl only, so no date library is needed.
 * Doses are entered as local wall-clock times ("08:00") and stored as UTC instants.
 */

const MINUTE = 60_000;

function partsIn(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** Offset of `timeZone` from UTC at `date`, in minutes (IST is +330). */
export function offsetMinutes(date: Date, timeZone: string): number {
  const p = partsIn(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / MINUTE);
}

/** Local date ("YYYY-MM-DD") and time ("HH:MM") in a zone, to a UTC Date. */
export function zonedToUtc(localDate: string, localTime: string, timeZone: string): Date {
  const [y, m, d] = localDate.split("-").map(Number);
  const [hh, mm] = localTime.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes settle the offset correctly across DST changes.
  const first = guess - offsetMinutes(new Date(guess), timeZone) * MINUTE;
  return new Date(guess - offsetMinutes(new Date(first), timeZone) * MINUTE);
}

/** The local calendar date ("YYYY-MM-DD") of an instant in a zone. */
export function localDate(date: Date, timeZone: string): string {
  const p = partsIn(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Adds whole days to a "YYYY-MM-DD" date. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}
