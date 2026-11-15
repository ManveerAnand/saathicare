import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import type { Appointment, DoseLog, Medication, Permissions, Profile } from "../domain/types";
import { appointmentConverter, doseLogConverter, medicationConverter, profileConverter } from "./converters";
import { newId } from "./ids";
import {
  compareMedications,
  doseLogId,
  type AppointmentInput,
  type MedicationInput,
  type NewProfile,
  type Repo,
} from "./types";

/**
 * Firestore layout:
 *   profiles/{profileId}
 *   profiles/{profileId}/medications/{id}
 *   profiles/{profileId}/doseLogs/{medicationId_scheduledFor}
 *   profiles/{profileId}/appointments/{id}
 *   profiles/{profileId}/sentReminders/{sha256(key)}
 */
export class FirestoreRepo implements Repo {
  constructor(private readonly db: Firestore) {}

  /** Builds the repo from FIREBASE_SERVICE_ACCOUNT (the service-account JSON, as one line). */
  static fromEnv(json: string): FirestoreRepo {
    const app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(json) as Record<string, string>) });
    return new FirestoreRepo(getFirestore(app));
  }

  private profile(id: string) {
    return this.db.collection("profiles").withConverter<Profile>(profileConverter).doc(id);
  }

  private medications(profileId: string) {
    return this.profile(profileId).collection("medications").withConverter<Medication>(medicationConverter);
  }

  private doseLogs(profileId: string) {
    return this.profile(profileId).collection("doseLogs").withConverter<DoseLog>(doseLogConverter);
  }

  private appointments(profileId: string) {
    return this.profile(profileId).collection("appointments").withConverter<Appointment>(appointmentConverter);
  }

  async createProfile(input: NewProfile): Promise<Profile> {
    const profile: Profile = { ...input, id: newId(8), createdAt: new Date().toISOString() };
    await this.profile(profile.id).create(profile);
    return profile;
  }

  async getProfile(id: string) {
    return (await this.profile(id).get()).data() ?? null;
  }

  async ensureProfile(profile: Profile) {
    const ref = this.profile(profile.id);
    return this.db.runTransaction(async (tx) => {
      const previous = (await tx.get(ref)).data();
      if (previous) return previous;
      tx.create(ref, profile);
      return profile;
    });
  }

  async listProfileIds() {
    const refs = await this.db.collection("profiles").listDocuments();
    return refs.map((r) => r.id);
  }

  async updatePermissions(id: string, permissions: Permissions) {
    await this.profile(id).update({ permissions });
  }

  async listMedications(profileId: string) {
    const snap = await this.medications(profileId).where("active", "==", true).get();
    // Firestore returns no fixed order, so sort here.
    return snap.docs.map((d) => d.data()).sort(compareMedications);
  }

  async getMedication(profileId: string, id: string) {
    return (await this.medications(profileId).doc(id).get()).data() ?? null;
  }

  async saveMedication(profileId: string, input: MedicationInput) {
    const id = input.id ?? newId();
    const ref = this.medications(profileId).doc(id);
    return this.db.runTransaction(async (tx) => {
      const previous = (await tx.get(ref)).data();
      const keepExplanation = previous?.explanation && previous.name === input.name && previous.dosage === input.dosage;
      const med: Medication = {
        ...input,
        id,
        active: true,
        updatedAt: new Date().toISOString(),
        ...(keepExplanation ? { explanation: previous.explanation } : {}),
      };
      tx.set(ref, med);
      return med;
    });
  }

  async setExplanation(profileId: string, id: string, explanation: string) {
    await this.medications(profileId).doc(id).update({ explanation });
  }

  async deactivateMedication(profileId: string, id: string) {
    await this.medications(profileId).doc(id).update({ active: false });
  }

  async listDoseLogs(profileId: string, sinceIso: string) {
    const snap = await this.doseLogs(profileId).where("scheduledFor", ">=", sinceIso).get();
    return snap.docs.map((d) => d.data());
  }

  async logDose(profileId: string, input: Omit<DoseLog, "id">) {
    const log: DoseLog = { ...input, id: doseLogId(input.medicationId, input.scheduledFor) };
    await this.doseLogs(profileId).doc(log.id).set(log);
    return log;
  }

  async listAppointments(profileId: string, fromIso: string) {
    const snap = await this.appointments(profileId).where("at", ">=", fromIso).orderBy("at").limit(50).get();
    return snap.docs.map((d) => d.data());
  }

  async saveAppointment(profileId: string, input: AppointmentInput) {
    const appt: Appointment = { ...input, id: input.id ?? newId() };
    await this.appointments(profileId).doc(appt.id).set(appt);
    return appt;
  }

  async deleteAppointment(profileId: string, id: string) {
    await this.appointments(profileId).doc(id).delete();
  }

  private sentRef(profileId: string, key: string) {
    const id = createHash("sha256").update(key).digest("hex");
    return this.profile(profileId).collection("sentReminders").doc(id);
  }

  async sentReminderKeys(profileId: string, keys: string[]) {
    if (!keys.length) return new Set<string>();
    const snaps = await this.db.getAll(...keys.map((k) => this.sentRef(profileId, k)));
    return new Set(keys.filter((_, i) => snaps[i].exists));
  }

  async markRemindersSent(profileId: string, keys: string[]) {
    const batch = this.db.batch();
    const at = new Date().toISOString();
    keys.forEach((key) => batch.set(this.sentRef(profileId, key), { key, at }));
    await batch.commit();
  }

  async clearCareData(profileId: string) {
    const names = ["medications", "doseLogs", "appointments", "sentReminders"];
    await Promise.all(names.map((n) => this.db.recursiveDelete(this.profile(profileId).collection(n))));
  }
}
