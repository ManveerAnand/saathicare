"use server";

import { revalidatePath } from "next/cache";
import { canManageAccess } from "@/lib/domain/permissions";
import { zonedToUtc } from "@/lib/domain/time";
import { repo } from "@/lib/server";
import { appointmentSchema, doseLogSchema, firstError, medicationSchema, permissionsSchema } from "@/lib/validation";
import { formError, type FormIssue } from "./formError";
import { requireEditor, requireSession } from "./session";
import type { FormState } from "./types";

const medicationFields = ["id", "name", "dosage", "instructions", "startDate", "endDate"];
const appointmentFields = ["doctor", "purpose", "location", "date", "time", "notes"];

/** Records a dose marked taken or skipped by a circle member. */
export async function logDose(form: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = doseLogSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  // Anyone in the circle can confirm a dose: that is how family helps.
  await repo().logDose(session.profileId, {
    ...parsed.data,
    loggedAt: new Date().toISOString(),
    loggedBy: session.role,
  });
  revalidatePath("/circle");
}

/** Validates and saves a medicine for a role allowed to edit the care plan. */
export async function saveMedication(previous: FormState, form: FormData): Promise<FormState> {
  const times = form.getAll("times").map(String);
  const fail = (error: FormIssue) =>
    formError(previous, error, form, medicationFields, { values: { times: times.join(",") } });
  const session = await requireEditor();
  if (!session) return fail("The elder has not allowed your role to edit medicines.");

  const parsed = medicationSchema.safeParse({
    name: form.get("name"),
    dosage: form.get("dosage"),
    instructions: form.get("instructions") ?? "",
    times: times.filter(Boolean),
    startDate: form.get("startDate"),
    endDate: form.get("endDate") || undefined,
  });
  if (!parsed.success) return fail(parsed.error);

  const id = String(form.get("id") ?? "") || undefined;
  await repo().saveMedication(session.profileId, { ...parsed.data, id, updatedBy: session.role });
  revalidatePath("/circle");
  return { ok: `${parsed.data.name} saved.` };
}

/** Stops an existing medicine in the signed-in circle. */
export async function removeMedication(form: FormData): Promise<void> {
  const session = await requireEditor();
  const id = String(form.get("id") ?? "");
  if (!session || !id) return;
  await repo().deactivateMedication(session.profileId, id);
  revalidatePath("/circle");
}

/** Saves a visit using the care circle's time zone. */
export async function saveAppointment(previous: FormState, form: FormData): Promise<FormState> {
  const fail = (error: FormIssue) => formError(previous, error, form, appointmentFields);
  const session = await requireEditor();
  if (!session) return fail("The elder has not allowed your role to edit appointments.");
  const parsed = appointmentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(parsed.error);

  const profile = await repo().getProfile(session.profileId);
  if (!profile) return fail("Care circle not found.");
  const { date, time, ...rest } = parsed.data;
  await repo().saveAppointment(session.profileId, {
    ...rest,
    at: zonedToUtc(date, time, profile.timeZone).toISOString(),
    updatedBy: session.role,
  });
  revalidatePath("/circle");
  return { ok: `Appointment with ${rest.doctor} saved.` };
}

/** Deletes an appointment when the signed-in role has editing permission. */
export async function removeAppointment(form: FormData): Promise<void> {
  const session = await requireEditor();
  const id = String(form.get("id") ?? "");
  if (!session || !id) return;
  await repo().deleteAppointment(session.profileId, id);
  revalidatePath("/circle");
}

/** Saves the elder's editing permissions and reminder delay. */
export async function updatePermissions(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!canManageAccess(session.role)) return { error: "Only the elder can change who may edit." };
  const parsed = permissionsSchema.safeParse({
    caretakerCanEdit: form.get("caretakerCanEdit") === "on",
    familyCanEdit: form.get("familyCanEdit") === "on",
    escalateAfterMinutes: Number(form.get("escalateAfterMinutes")),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  await repo().updatePermissions(session.profileId, parsed.data);
  revalidatePath("/circle");
  return { ok: "Your choices are saved." };
}
