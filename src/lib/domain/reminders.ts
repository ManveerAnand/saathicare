import type { Appointment, DoseLog, Medication, Profile } from "./types";
import { DUE_WINDOW_MINUTES, MISSED_AFTER_MINUTES, dosesForDate } from "./schedule";
import { addDays, localDate } from "./time";

export type ReminderKind = "upcoming-dose" | "missed-dose" | "escalation" | "appointment";

export interface Reminder {
  /** Stable key so the same reminder is never sent twice. */
  key: string;
  kind: ReminderKind;
  to: string[];
  subject: string;
  text: string;
}

const MINUTE = 60_000;
const APPOINTMENT_NOTICE_HOURS = 24;

/**
 * Decides which emails are due at `now`.
 * The elder is reminded first; caretakers and family hear about a missed dose only after
 * the escalation delay the elder chose, so the elder stays in charge of their own routine.
 */
export function remindersDue(
  profile: Profile,
  meds: Medication[],
  logs: DoseLog[],
  appointments: Appointment[],
  alreadySent: Set<string>,
  now: Date,
): Reminder[] {
  const tz = profile.timeZone;
  const today = localDate(now, tz);
  const others = profile.contacts.map((c) => c.email);
  const out: Reminder[] = [];
  const add = (r: Reminder) => {
    if (r.to.length && !alreadySent.has(r.key)) out.push(r);
  };

  // Yesterday too, so a late-evening dose missed just before midnight still escalates.
  const doses = [...dosesForDate(meds, logs, addDays(today, -1), tz, now), ...dosesForDate(meds, logs, today, tz, now)];

  for (const dose of doses) {
    const minutesLate = (now.getTime() - Date.parse(dose.scheduledFor)) / MINUTE;
    const id = `${dose.medicationId}|${dose.scheduledFor}`;
    const what = `${dose.medicationName} (${dose.dosage}) at ${dose.localTime}`;

    if (dose.status === "due" && minutesLate < 0 && minutesLate >= -DUE_WINDOW_MINUTES) {
      add({
        key: `upcoming|${id}`,
        kind: "upcoming-dose",
        to: [profile.elderEmail],
        subject: `Reminder: ${dose.medicationName} at ${dose.localTime}`,
        text: `Hello ${profile.elderName}, it is almost time for ${what}. Tap "Taken" in SaathiCare once you have had it.`,
      });
    }

    if (dose.status === "missed") {
      add({
        key: `missed|${id}`,
        kind: "missed-dose",
        to: [profile.elderEmail],
        subject: `Did you take ${dose.medicationName}?`,
        text: `Hello ${profile.elderName}, ${what} has not been marked as taken. If you have had it, mark it in SaathiCare.`,
      });
      if (minutesLate >= MISSED_AFTER_MINUTES + profile.permissions.escalateAfterMinutes) {
        add({
          key: `escalation|${id}`,
          kind: "escalation",
          to: others,
          subject: `${profile.elderName} may have missed ${dose.medicationName}`,
          text: `${what} is still not marked as taken. You may want to check in with ${profile.elderName}.`,
        });
      }
    }
  }

  for (const appt of appointments) {
    const hoursAway = (Date.parse(appt.at) - now.getTime()) / (60 * MINUTE);
    if (hoursAway > 0 && hoursAway <= APPOINTMENT_NOTICE_HOURS) {
      const when = new Date(appt.at).toLocaleString("en-IN", {
        timeZone: tz,
        dateStyle: "medium",
        timeStyle: "short",
      });
      add({
        key: `appointment|${appt.id}|${appt.at}`,
        kind: "appointment",
        to: [profile.elderEmail, ...others],
        subject: `Appointment with ${appt.doctor}: ${when}`,
        text: `${profile.elderName} has an appointment with ${appt.doctor} (${appt.purpose}) at ${appt.location} on ${when}.`,
      });
    }
  }

  return out;
}
