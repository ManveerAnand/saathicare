import { dosesForDate } from "./domain/schedule";
import { addDays, localDate, zonedToUtc } from "./domain/time";
import type { Medication, Profile } from "./domain/types";
import type { Repo } from "./repo/types";

export const DEMO_PROFILE_ID = "democircle";
const TZ = "Asia/Kolkata";

/** Doses left unlogged in the past week, so the trend and Care Assistant have something to say. */
const MISSED: ReadonlyArray<[daysAgo: number, medName: string, time: string]> = [
  [0, "Amoxicillin", "08:00"],
  [2, "Metformin", "20:00"],
  [5, "Metformin", "20:00"],
  [3, "Atorvastatin", "21:00"],
  [9, "Metformin", "20:00"],
  [12, "Atorvastatin", "21:00"],
  [16, "Metformin", "20:00"],
  [23, "Amlodipine", "09:00"],
];
/** Days of history to fill: enough for the 30-day doctor visit summary. */
const HISTORY_DAYS = 30;

function demoMeds(today: string): Omit<Medication, "id" | "active" | "updatedAt">[] {
  return [
    { name: "Metformin", dosage: "500 mg", instructions: "After breakfast and dinner", times: ["08:00", "20:00"], startDate: addDays(today, -30), updatedBy: "caretaker" },
    { name: "Amlodipine", dosage: "5 mg", instructions: "For blood pressure, same time every day", times: ["09:00"], startDate: addDays(today, -30), updatedBy: "caretaker" },
    { name: "Atorvastatin", dosage: "10 mg", instructions: "At bedtime", times: ["21:00"], startDate: addDays(today, -30), updatedBy: "elder" },
    { name: "Amoxicillin", dosage: "500 mg", instructions: "Finish the full course", times: ["08:00", "14:00", "20:00"], startDate: addDays(today, -4), endDate: addDays(today, 2), updatedBy: "caretaker" },
  ];
}

/**
 * Makes sure the public demo circle exists and looks lived-in: four medicines, a week of
 * history with a few missed doses, and two upcoming appointments. Safe to call on every visit:
 * it only fills in what is missing, so a visitor's own changes today are kept.
 */
export async function ensureDemoCircle(repo: Repo, hashes: Profile["passcodeHashes"], now = new Date()): Promise<Profile> {
  const profile = await repo.ensureProfile({
    id: DEMO_PROFILE_ID,
    elderName: "Kamala Devi",
    elderEmail: "kamala.demo@example.com",
    timeZone: TZ,
    contacts: [
      { name: "Asha (caretaker)", email: "asha.demo@example.com", role: "caretaker" },
      { name: "Ravi (son)", email: "ravi.demo@example.com", role: "family" },
    ],
    permissions: { caretakerCanEdit: true, familyCanEdit: false, escalateAfterMinutes: 30 },
    passcodeHashes: hashes,
    createdAt: now.toISOString(),
    isDemo: true,
  });

  const today = localDate(now, TZ);
  let meds = await repo.listMedications(profile.id);
  if (meds.length === 0) {
    meds = await Promise.all(demoMeds(today).map((m) => repo.saveMedication(profile.id, m)));
  }

  // Fill the past week, including today's doses that are already overdue (only where nothing
  // is logged yet), leaving the few MISSED ones so the trend and Care Assistant have a story.
  const historyStart = zonedToUtc(addDays(today, -(HISTORY_DAYS - 1)), "00:00", TZ).toISOString();
  const logged = new Set((await repo.listDoseLogs(profile.id, historyStart)).map((l) => `${l.medicationId}|${l.scheduledFor}`));
  const writes: Promise<unknown>[] = [];
  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo--) {
    for (const dose of dosesForDate(meds, [], addDays(today, -daysAgo), TZ, now)) {
      if (daysAgo === 0 && dose.status !== "missed") continue; // keep today's due and later doses open
      const key = `${dose.medicationId}|${dose.scheduledFor}`;
      const missed = MISSED.some(([d, name, time]) => d === daysAgo && name === dose.medicationName && time === dose.localTime);
      if (logged.has(key) || missed) continue;
      writes.push(
        repo.logDose(profile.id, {
          medicationId: dose.medicationId,
          scheduledFor: dose.scheduledFor,
          status: "taken",
          loggedAt: dose.scheduledFor,
          loggedBy: dose.localTime < "12:00" ? "elder" : "caretaker",
        }),
      );
    }
  }
  await Promise.all(writes);

  const upcoming = await repo.listAppointments(profile.id, now.toISOString());
  if (upcoming.length === 0) {
    await Promise.all([
      repo.saveAppointment(profile.id, {
        doctor: "Dr. Mehta (Cardiology)",
        purpose: "Blood pressure review",
        location: "Apollo Clinic, 2nd floor",
        at: zonedToUtc(addDays(today, 1), "11:00", TZ).toISOString(),
        notes: "Bring the BP diary",
        updatedBy: "caretaker",
      }),
      repo.saveAppointment(profile.id, {
        doctor: "Dr. Rao (Diabetology)",
        purpose: "HbA1c results",
        location: "City Diabetes Centre",
        at: zonedToUtc(addDays(today, 9), "10:30", TZ).toISOString(),
        notes: "Fasting blood test the same morning",
        updatedBy: "elder",
      }),
    ]);
  }

  return profile;
}
