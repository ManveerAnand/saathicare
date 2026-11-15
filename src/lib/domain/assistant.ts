import type { Adherence } from "./schedule";
import { addDays, localDate } from "./time";
import type { Appointment, Dose, Medication, Profile, Role } from "./types";

export type InsightLevel = "urgent" | "attention" | "info" | "good";

export interface Insight {
  level: InsightLevel;
  message: string;
}

export interface AssistantContext {
  profile: Profile;
  viewer: Role;
  todaysDoses: Dose[];
  meds: Medication[];
  week: Adherence;
  appointments: Appointment[];
  now: Date;
}

const HOUR = 3_600_000;
/** If the next dose of the same medicine is this close, warn against doubling up. */
const DOUBLE_DOSE_WINDOW_HOURS = 4;
const LOW_ADHERENCE_PERCENT = 80;
const MIN_DOSES_FOR_TREND = 3;
const COURSE_ENDING_DAYS = 3;
const ORDER: InsightLevel[] = ["urgent", "attention", "info", "good"];

/**
 * The Care Assistant: plain rules that turn today's context into short, specific guidance.
 * It speaks to the elder as "you" and to everyone else by the elder's name, and it never
 * tells anyone to change a dose: it points them to the label or the doctor.
 */
export function careInsights(ctx: AssistantContext): Insight[] {
  const { profile, viewer, todaysDoses, meds, week, appointments, now } = ctx;
  const tz = profile.timeZone;
  const isElder = viewer === "elder";
  const who = isElder ? "you" : profile.elderName;
  const out: Insight[] = [];

  for (const dose of todaysDoses.filter((d) => d.status === "missed")) {
    const next = todaysDoses.find(
      (d) => d.medicationId === dose.medicationId && d.scheduledFor > dose.scheduledFor,
    );
    const hoursToNext = next ? (Date.parse(next.scheduledFor) - now.getTime()) / HOUR : Infinity;
    out.push(
      hoursToNext <= DOUBLE_DOSE_WINDOW_HOURS && next
        ? {
            level: "urgent",
            message: `The ${dose.localTime} ${dose.medicationName} was missed and the next dose is at ${next.localTime}. Do not take two doses together unless the doctor says so.`,
          }
        : {
            level: "urgent",
            message: isElder
              ? `You have not marked the ${dose.localTime} ${dose.medicationName}. If you took it, tap "Taken". If not, check the label or ask your doctor before taking it late.`
              : `${profile.elderName} has not marked the ${dose.localTime} ${dose.medicationName}. A quick call may help.`,
          },
    );
  }

  const dueNow = todaysDoses.filter((d) => d.status === "due");
  if (dueNow.length) {
    const names = dueNow.map((d) => d.medicationName).join(", ");
    out.push({ level: "attention", message: `Time now for ${names}.` });
  }

  const decided = week.taken + week.missed + week.skipped;
  if (week.percent !== null && decided >= MIN_DOSES_FOR_TREND && week.percent < LOW_ADHERENCE_PERCENT) {
    out.push({
      level: "attention",
      message: isElder
        ? `This week you took ${week.percent}% of your doses. A pill box or a phone alarm at dose times can make it easier.`
        : `${profile.elderName} took ${week.percent}% of doses this week. Consider checking in, or ask if dose times suit their day.`,
    });
  }

  const soon = appointments.find((a) => Date.parse(a.at) - now.getTime() <= 48 * HOUR);
  if (soon) {
    const when = new Date(soon.at).toLocaleString("en-IN", { timeZone: tz, weekday: "long", hour: "numeric", minute: "2-digit" });
    out.push({
      level: "info",
      message: `${isElder ? "You have" : `${profile.elderName} has`} an appointment with ${soon.doctor} on ${when}. Take the medicine list${soon.notes ? ` and remember: ${soon.notes}` : ""}.`,
    });
  }

  const today = localDate(now, tz);
  const ending = meds.filter((m) => m.endDate && m.endDate >= today && m.endDate <= addDays(today, COURSE_ENDING_DAYS));
  for (const m of ending) {
    out.push({
      level: "info",
      message: `${m.name} is planned to end on ${m.endDate}. Check with the doctor whether ${who === "you" ? "you" : "they"} should continue or stop.`,
    });
  }

  if (todaysDoses.length && todaysDoses.every((d) => d.status === "taken" || d.status === "skipped")) {
    out.push({ level: "good", message: isElder ? "All of today's doses are done. Well done!" : `${profile.elderName} has finished today's doses.` });
  }

  return out.sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level));
}
