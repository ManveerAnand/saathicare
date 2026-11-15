import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  type DocumentReference,
  type Firestore,
  type QueryDocumentSnapshot,
  type Transaction,
} from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import type { Appointment, DoseLog, Medication, Permissions, Profile } from "../domain/types";
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
    return this.db.collection("profiles").doc(id);
  }

  async createProfile(input: NewProfile): Promise<Profile> {
    const profile: Profile = { ...input, id: newId(8), createdAt: new Date().toISOString() };
    await this.profile(profile.id).create(profile);
    return profile;
  }

  async getProfile(id: string) {
    const snap = await this.profile(id).get();
    return snap.exists ? (snap.data() as Profile) : null;
  }

  async ensureProfile(profile: Profile) {
    const ref = this.profile(profile.id);
    return this.db.runTransaction(async (tx: Transaction) => {
      const snap = await tx.get(ref);
      if (snap.exists) return snap.data() as Profile;
      tx.create(ref, JSON.parse(JSON.stringify(profile)) as Profile);
      return profile;
    });
  }

  async listProfileIds() {
    const refs = await this.db.collection("profiles").listDocuments();
    return refs.map((r: DocumentReference) => r.id);
  }

  async updatePermissions(id: string, permissions: Permissions) {
    await this.profile(id).update({ permissions });
  }

  async listMedications(profileId: string) {
    const snap = await this.profile(profileId).collection("medications").where("active", "==", true).get();
    // Firestore returns no fixed order, so sort here.
    return snap.docs.map((d: QueryDocumentSnapshot) => d.data() as Medication).sort(compareMedications);
  }

  async getMedication(profileId: string, id: string) {
    const snap = await this.profile(profileId).collection("medications").doc(id).get();
    return snap.exists ? (snap.data() as Medication) : null;
  }

  async saveMedication(profileId: string, input: MedicationInput) {
    const id = input.id ?? newId();
    const ref = this.profile(profileId).collection("medications").doc(id);
    return this.db.runTransaction(async (tx: Transaction) => {
      const previous = (await tx.get(ref)).data() as Medication | undefined;
      const keepExplanation = previous?.explanation && previous.name === input.name && previous.dosage === input.dosage;
      const med: Medication = {
        ...input,
        id,
        active: true,
        updatedAt: new Date().toISOString(),
        ...(keepExplanation ? { explanation: previous.explanation } : {}),
      };
      // Firestore rejects undefined fields.
      tx.set(ref, JSON.parse(JSON.stringify(med)) as Medication);
      return med;
    });
  }

  async setExplanation(profileId: string, id: string, explanation: string) {
    await this.profile(profileId).collection("medications").doc(id).update({ explanation });
  }

  async deactivateMedication(profileId: string, id: string) {
    await this.profile(profileId).collection("medications").doc(id).update({ active: false });
  }

  async listDoseLogs(profileId: string, sinceIso: string) {
    const snap = await this.profile(profileId).collection("doseLogs").where("scheduledFor", ">=", sinceIso).get();
    return snap.docs.map((d: QueryDocumentSnapshot) => d.data() as DoseLog);
  }

  async logDose(profileId: string, input: Omit<DoseLog, "id">) {
    const log: DoseLog = { ...input, id: doseLogId(input.medicationId, input.scheduledFor) };
    await this.profile(profileId).collection("doseLogs").doc(log.id).set(log);
    return log;
  }

  async listAppointments(profileId: string, fromIso: string) {
    const snap = await this.profile(profileId)
      .collection("appointments")
      .where("at", ">=", fromIso)
      .orderBy("at")
      .limit(50)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) => d.data() as Appointment);
  }

  async saveAppointment(profileId: string, input: AppointmentInput) {
    const appt: Appointment = { ...input, id: input.id ?? newId() };
    await this.profile(profileId)
      .collection("appointments")
      .doc(appt.id)
      .set(JSON.parse(JSON.stringify(appt)) as Appointment);
    return appt;
  }

  async deleteAppointment(profileId: string, id: string) {
    await this.profile(profileId).collection("appointments").doc(id).delete();
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
