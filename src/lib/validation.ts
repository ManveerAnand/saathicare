import { z } from "zod";
import { isValidTimeZone } from "./domain/time";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const localTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

/** Six to twelve digits: easy for an elder to remember, slow to guess with rate limiting. */
export const passcodeSchema = z.string().regex(/^\d{6,12}$/, "Use 6 to 12 digits");

export const contactSchema = z.object({
  name: text(80),
  email: z.email().max(254),
  role: z.enum(["caretaker", "family"]),
});

export const createProfileSchema = z
  .object({
    elderName: text(80),
    elderEmail: z.email().max(254),
    timeZone: z.string().refine(isValidTimeZone, "Unknown time zone"),
    elderPasscode: passcodeSchema,
    caretakerPasscode: passcodeSchema,
    familyPasscode: passcodeSchema,
    contacts: z.array(contactSchema).max(10).default([]),
  })
  .refine(
    (v) => new Set([v.elderPasscode, v.caretakerPasscode, v.familyPasscode]).size === 3,
    { message: "Each role needs a different passcode", path: ["familyPasscode"] },
  );

export const loginSchema = z.object({
  profileId: z.string().regex(/^[a-z0-9]{6,32}$/, "Check the care code"),
  passcode: passcodeSchema,
});

export const medicationSchema = z
  .object({
    name: text(80),
    dosage: text(60),
    instructions: optionalText(300),
    times: z.array(localTime).min(1).max(8).refine(
      (times) => new Set(times).size === times.length,
      "Use each dose time only once",
    ),
    startDate: localDate,
    endDate: localDate.optional(),
  })
  .refine((m) => !m.endDate || m.endDate >= m.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

export const appointmentSchema = z.object({
  doctor: text(80),
  purpose: text(120),
  location: text(160),
  date: localDate,
  time: localTime,
  notes: optionalText(500),
});

export const doseLogSchema = z.object({
  medicationId: z.string().min(1).max(64),
  scheduledFor: z.iso.datetime(),
  status: z.enum(["taken", "skipped"]),
});

export const permissionsSchema = z.object({
  caretakerCanEdit: z.boolean(),
  familyCanEdit: z.boolean(),
  escalateAfterMinutes: z.number().int().min(0).max(24 * 60),
});

/** Medications Gemini reads from a prescription photo. Validated before anyone sees them. */
export const extractedMedicationsSchema = z.object({
  medications: z
    .array(
      z.object({
        name: z.string().max(80),
        dosage: z.string().max(60),
        instructions: z.string().max(300).default(""),
        times: z.array(localTime).max(8).default([]),
      }),
    )
    .max(20),
});

export type ExtractedMedication = z.infer<typeof extractedMedicationsSchema>["medications"][number];

/** First validation error as one readable line, for showing next to a form. */
export function firstError(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue ? `${issue.path.join(".") || "input"}: ${issue.message}` : "Invalid input";
}
