"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { canResetDemo, ensureDemoCircle, resetDemoCircle } from "@/lib/demo";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPasscode, verifyPasscode } from "@/lib/auth/passcode";
import { createToken, SESSION_TTL_MS, type Session } from "@/lib/auth/token";
import { explainMedication, extractMedications, geminiConfigured } from "@/lib/ai/gemini";
import { canEdit, canManageAccess } from "@/lib/domain/permissions";
import { zonedToUtc } from "@/lib/domain/time";
import { ROLES, type Role } from "@/lib/domain/types";
import { currentSession, loginLimiter, repo, SESSION_COOKIE, sessionSecret } from "@/lib/server";
import {
  appointmentSchema,
  createProfileSchema,
  doseLogSchema,
  firstError,
  loginSchema,
  medicationSchema,
  permissionsSchema,
  type ExtractedMedication,
} from "@/lib/validation";

export interface FormState {
  error?: string;
  ok?: string;
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function startSession(profileId: string, role: Role) {
  const session: Session = { profileId, role, exp: Date.now() + SESSION_TTL_MS };
  (await cookies()).set(SESSION_COOKIE, createToken(session, sessionSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

/** The signed-in session, or a redirect to the sign-in page. */
async function requireSession(): Promise<Session> {
  const session = await currentSession();
  if (!session) redirect("/");
  return session;
}

/** The session, if this role may edit the care plan. */
async function requireEditor(): Promise<Session | null> {
  const session = await requireSession();
  const profile = await repo().getProfile(session.profileId);
  return profile && canEdit(profile, session.role) ? session : null;
}

export async function createProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const contacts = [0, 1, 2]
    .map((i) => ({
      name: String(form.get(`contactName${i}`) ?? "").trim(),
      email: String(form.get(`contactEmail${i}`) ?? "").trim(),
      role: String(form.get(`contactRole${i}`) ?? "family"),
    }))
    .filter((c) => c.name || c.email);

  const parsed = createProfileSchema.safeParse({ ...Object.fromEntries(form), contacts });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = parsed.data;

  const [elder, caretaker, family] = await Promise.all(
    [v.elderPasscode, v.caretakerPasscode, v.familyPasscode].map(hashPasscode),
  );
  const profile = await repo().createProfile({
    elderName: v.elderName,
    elderEmail: v.elderEmail,
    timeZone: v.timeZone,
    contacts: v.contacts,
    permissions: { caretakerCanEdit: true, familyCanEdit: false, escalateAfterMinutes: 30 },
    passcodeHashes: { elder, caretaker, family },
  });
  await startSession(profile.id, "elder");
  redirect(`/circle?welcome=${profile.id}`);
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    profileId: String(form.get("profileId") ?? "").trim().toLowerCase(),
    passcode: form.get("passcode"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { profileId, passcode } = parsed.data;

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limitKey = `${ip}|${profileId}`;
  if (!loginLimiter().allow(limitKey)) {
    return { error: "Too many attempts. Please wait 15 minutes and try again." };
  }

  const profile = await repo().getProfile(profileId);
  // Check every role so the time taken does not reveal which passcodes exist.
  const matches = profile
    ? await Promise.all(ROLES.map((r) => verifyPasscode(passcode, profile.passcodeHashes[r])))
    : [];
  const role = ROLES.find((_, i) => matches[i]);
  if (!profile || !role) return { error: "That care code and passcode do not match." };

  loginLimiter().reset(limitKey);
  await startSession(profile.id, role);
  redirect("/circle");
}

/** Opens the public demo circle in the chosen role. Demo passcodes are random and never shown. */
export async function enterDemo(form: FormData): Promise<void> {
  const role = ROLES.find((r) => r === form.get("role")) ?? "family";
  const hashes = await Promise.all(ROLES.map(() => hashPasscode(randomBytes(16).toString("hex"))));
  const profile = await ensureDemoCircle(repo(), { elder: hashes[0], caretaker: hashes[1], family: hashes[2] });
  await startSession(profile.id, role);
  redirect("/circle");
}

/** Clears visitor changes in the public demo and re-seeds it. Never touches a real circle. */
export async function resetDemo(): Promise<void> {
  const session = await requireSession();
  if (!canResetDemo(session.profileId)) return;
  const profile = await repo().getProfile(session.profileId);
  if (!profile) redirect("/");
  await resetDemoCircle(repo(), session.profileId, profile.passcodeHashes);
  revalidatePath("/circle");
  redirect("/circle");
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}

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

export async function saveMedication(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await requireEditor();
  if (!session) return { error: "The elder has not allowed your role to edit medicines." };

  const times = form.getAll("times").map(String).filter(Boolean);
  const parsed = medicationSchema.safeParse({
    name: form.get("name"),
    dosage: form.get("dosage"),
    instructions: form.get("instructions") ?? "",
    times,
    startDate: form.get("startDate"),
    endDate: form.get("endDate") || undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const id = String(form.get("id") ?? "") || undefined;
  await repo().saveMedication(session.profileId, { ...parsed.data, id, updatedBy: session.role });
  revalidatePath("/circle");
  return { ok: `${parsed.data.name} saved.` };
}

export async function removeMedication(form: FormData): Promise<void> {
  const session = await requireEditor();
  const id = String(form.get("id") ?? "");
  if (!session || !id) return;
  await repo().deactivateMedication(session.profileId, id);
  revalidatePath("/circle");
}

export async function saveAppointment(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await requireEditor();
  if (!session) return { error: "The elder has not allowed your role to edit appointments." };
  const parsed = appointmentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const profile = await repo().getProfile(session.profileId);
  if (!profile) return { error: "Care circle not found." };
  const { date, time, ...rest } = parsed.data;
  await repo().saveAppointment(session.profileId, {
    ...rest,
    at: zonedToUtc(date, time, profile.timeZone).toISOString(),
    updatedBy: session.role,
  });
  revalidatePath("/circle");
  return { ok: `Appointment with ${rest.doctor} saved.` };
}

export async function removeAppointment(form: FormData): Promise<void> {
  const session = await requireEditor();
  const id = String(form.get("id") ?? "");
  if (!session || !id) return;
  await repo().deleteAppointment(session.profileId, id);
  revalidatePath("/circle");
}

export async function explain(form: FormData): Promise<void> {
  const session = await requireSession();
  const id = String(form.get("id") ?? "");
  const med = id ? await repo().getMedication(session.profileId, id) : null;
  // Cached on the medication, so Gemini is asked once per medicine, not on every view.
  if (!med || med.explanation || !geminiConfigured()) return;
  try {
    const text = await explainMedication(med.name, med.dosage, med.instructions);
    if (text) await repo().setExplanation(session.profileId, id, text);
  } catch (err) {
    // A slow or failed answer is not saved; the button stays so the person can try again.
    console.error("[explain] Gemini request failed:", (err as Error).message);
  }
  revalidatePath("/circle");
}

export interface ScanState extends FormState {
  drafts?: ExtractedMedication[];
}

export async function scanPrescription(_prev: ScanState, form: FormData): Promise<ScanState> {
  const session = await requireEditor();
  if (!session) return { error: "The elder has not allowed your role to add medicines." };
  if (!geminiConfigured()) return { error: "Prescription reading is not set up on this server." };

  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo first." };
  if (!IMAGE_TYPES.has(file.type)) return { error: "Use a JPEG, PNG or WebP photo." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "The photo must be under 4 MB." };

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const drafts = await extractMedications(base64, file.type);
    return drafts.length
      ? { drafts, ok: `Found ${drafts.length}. Check each one, then save it.` }
      : { error: "No medicines could be read clearly. Try a sharper photo, or add them by hand." };
  } catch (err) {
    console.error("[scan] Gemini request failed:", (err as Error).message);
    return { error: "Reading the photo failed. Please try again or add medicines by hand." };
  }
}

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
