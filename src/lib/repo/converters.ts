import type { FirestoreDataConverter } from "firebase-admin/firestore";
import { z } from "zod";
import { ROLES, type Appointment, type DoseLog, type Medication, type Profile } from "../domain/types";

function cleanValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => cleanValue(item ?? null));
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return cleanFields(value);
  }
  return value;
}

function cleanFields(value: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, cleanValue(item)]),
  );
}

function converter<T extends object>(schema: z.ZodType<T>) {
  return {
    toFirestore: cleanFields,
    fromFirestore: (snapshot: { data(): unknown }) => schema.parse(snapshot.data()),
  } satisfies FirestoreDataConverter<T>;
}

const role = z.enum(ROLES);

export const profileConverter = converter<Profile>(
  z.object({
    id: z.string(),
    elderName: z.string(),
    elderEmail: z.string(),
    timeZone: z.string(),
    contacts: z.array(z.object({ name: z.string(), email: z.string(), role: z.enum(["caretaker", "family"]) })),
    permissions: z.object({
      caretakerCanEdit: z.boolean(),
      familyCanEdit: z.boolean(),
      escalateAfterMinutes: z.number(),
    }),
    passcodeHashes: z.record(role, z.string()),
    createdAt: z.string(),
    isDemo: z.boolean().optional(),
  }),
);

export const medicationConverter = converter<Medication>(
  z.object({
    id: z.string(),
    name: z.string(),
    dosage: z.string(),
    instructions: z.string(),
    times: z.array(z.string()),
    startDate: z.string(),
    endDate: z.string().optional(),
    active: z.boolean(),
    explanation: z.string().optional(),
    updatedBy: role,
    updatedAt: z.string(),
  }),
);

export const doseLogConverter = converter<DoseLog>(
  z.object({
    id: z.string(),
    medicationId: z.string(),
    scheduledFor: z.string(),
    status: z.enum(["taken", "skipped"]),
    loggedAt: z.string(),
    loggedBy: role,
  }),
);

export const appointmentConverter = converter<Appointment>(
  z.object({
    id: z.string(),
    doctor: z.string(),
    purpose: z.string(),
    location: z.string(),
    at: z.string(),
    notes: z.string().optional(),
    updatedBy: role,
  }),
);
