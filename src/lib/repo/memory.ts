import type { Appointment, DoseLog, Medication, Profile } from "../domain/types";
import { newId } from "./ids";
import { compareMedications, doseLogId, type Repo } from "./types";

interface Bucket {
  meds: Map<string, Medication>;
  logs: Map<string, DoseLog>;
  appts: Map<string, Appointment>;
  sent: Set<string>;
}

/** In-memory Repo for tests and for running locally without Firebase. Data is lost on restart. */
export class MemoryRepo implements Repo {
  private profiles = new Map<string, Profile>();
  private buckets = new Map<string, Bucket>();

  private bucket(profileId: string): Bucket {
    let b = this.buckets.get(profileId);
    if (!b) {
      b = { meds: new Map(), logs: new Map(), appts: new Map(), sent: new Set() };
      this.buckets.set(profileId, b);
    }
    return b;
  }

  async createProfile(input: Omit<Profile, "id" | "createdAt">) {
    const profile: Profile = { ...input, id: newId(8), createdAt: new Date().toISOString() };
    this.profiles.set(profile.id, profile);
    return structuredClone(profile);
  }

  async getProfile(id: string) {
    const p = this.profiles.get(id);
    return p ? structuredClone(p) : null;
  }

  async ensureProfile(profile: Profile) {
    if (!this.profiles.has(profile.id)) this.profiles.set(profile.id, structuredClone(profile));
    return structuredClone(this.profiles.get(profile.id)!);
  }

  async listProfileIds() {
    return [...this.profiles.keys()];
  }

  async updatePermissions(id: string, permissions: Profile["permissions"]) {
    const p = this.profiles.get(id);
    if (p) p.permissions = { ...permissions };
  }

  async listMedications(profileId: string) {
    return [...this.bucket(profileId).meds.values()]
      .filter((m) => m.active)
      .sort(compareMedications)
      .map((m) => structuredClone(m));
  }

  async getMedication(profileId: string, id: string) {
    const m = this.bucket(profileId).meds.get(id);
    return m ? structuredClone(m) : null;
  }

  async saveMedication(profileId: string, input: Parameters<Repo["saveMedication"]>[1]) {
    const meds = this.bucket(profileId).meds;
    const id = input.id ?? newId();
    const previous = meds.get(id);
    const med: Medication = {
      ...input,
      id,
      active: true,
      // A changed name or dosage needs a fresh explanation.
      explanation:
        previous && previous.name === input.name && previous.dosage === input.dosage ? previous.explanation : undefined,
      updatedAt: new Date().toISOString(),
    };
    meds.set(id, med);
    return structuredClone(med);
  }

  async setExplanation(profileId: string, id: string, explanation: string) {
    const m = this.bucket(profileId).meds.get(id);
    if (m) m.explanation = explanation;
  }

  async deactivateMedication(profileId: string, id: string) {
    const m = this.bucket(profileId).meds.get(id);
    if (m) m.active = false;
  }

  async listDoseLogs(profileId: string, sinceIso: string) {
    return [...this.bucket(profileId).logs.values()].filter((l) => l.scheduledFor >= sinceIso).map((l) => ({ ...l }));
  }

  async logDose(profileId: string, input: Omit<DoseLog, "id">) {
    const log: DoseLog = { ...input, id: doseLogId(input.medicationId, input.scheduledFor) };
    this.bucket(profileId).logs.set(log.id, log);
    return { ...log };
  }

  async listAppointments(profileId: string, fromIso: string) {
    return [...this.bucket(profileId).appts.values()]
      .filter((a) => a.at >= fromIso)
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((a) => ({ ...a }));
  }

  async saveAppointment(profileId: string, input: Parameters<Repo["saveAppointment"]>[1]) {
    const appt: Appointment = { ...input, id: input.id ?? newId() };
    this.bucket(profileId).appts.set(appt.id, appt);
    return { ...appt };
  }

  async deleteAppointment(profileId: string, id: string) {
    this.bucket(profileId).appts.delete(id);
  }

  async sentReminderKeys(profileId: string, keys: string[]) {
    const sent = this.bucket(profileId).sent;
    return new Set(keys.filter((k) => sent.has(k)));
  }

  async markRemindersSent(profileId: string, keys: string[]) {
    const sent = this.bucket(profileId).sent;
    keys.forEach((k) => sent.add(k));
  }

  async clearCareData(profileId: string) {
    this.buckets.delete(profileId);
  }
}
