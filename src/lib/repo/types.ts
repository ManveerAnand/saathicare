import type { Appointment, DoseLog, Medication, Permissions, Profile } from "../domain/types";

export type NewProfile = Omit<Profile, "id" | "createdAt">;
export type MedicationInput = Omit<Medication, "id" | "active" | "updatedAt"> & { id?: string };
export type AppointmentInput = Omit<Appointment, "id"> & { id?: string };

/** Storage for one app. Firestore in production, memory for tests and local demos. */
export interface Repo {
  createProfile(profile: NewProfile): Promise<Profile>;
  getProfile(id: string): Promise<Profile | null>;
  /** Every profile id, for the reminder job. */
  listProfileIds(): Promise<string[]>;
  updatePermissions(id: string, permissions: Permissions): Promise<void>;

  listMedications(profileId: string): Promise<Medication[]>;
  getMedication(profileId: string, id: string): Promise<Medication | null>;
  saveMedication(profileId: string, med: MedicationInput): Promise<Medication>;
  setExplanation(profileId: string, id: string, explanation: string): Promise<void>;
  /** Soft delete: past dose history stays meaningful. */
  deactivateMedication(profileId: string, id: string): Promise<void>;

  /** Logs scheduled on or after `sinceIso`. */
  listDoseLogs(profileId: string, sinceIso: string): Promise<DoseLog[]>;
  /** One log per dose: logging again replaces the earlier status. */
  logDose(profileId: string, log: Omit<DoseLog, "id">): Promise<DoseLog>;

  /** Appointments at or after `fromIso`, soonest first. */
  listAppointments(profileId: string, fromIso: string): Promise<Appointment[]>;
  saveAppointment(profileId: string, appt: AppointmentInput): Promise<Appointment>;
  deleteAppointment(profileId: string, id: string): Promise<void>;

  /** Which of these reminder keys were already sent. */
  sentReminderKeys(profileId: string, keys: string[]): Promise<Set<string>>;
  markRemindersSent(profileId: string, keys: string[]): Promise<void>;
}

/** Firestore document ids cannot contain "/", and ":" and "." read badly in the console. */
export function doseLogId(medicationId: string, scheduledFor: string): string {
  return `${medicationId}_${scheduledFor.replace(/[^0-9A-Za-z]/g, "")}`;
}
