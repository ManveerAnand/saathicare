"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { hashPasscode, verifyPasscode } from "@/lib/auth/passcode";
import { ROLES } from "@/lib/domain/types";
import { loginLimiter, repo, SESSION_COOKIE } from "@/lib/server";
import { createProfileSchema, loginSchema } from "@/lib/validation";
import { formError, type FormIssue } from "./formError";
import { startSession } from "./session";
import type { FormState } from "./types";

const contactSlots = [0, 1, 2];
const setupFields = [
  "elderName",
  "elderEmail",
  "timeZone",
  ...contactSlots.flatMap((i) => [`contactName${i}`, `contactEmail${i}`, `contactRole${i}`]),
];

/** Creates a care circle and signs in its elder. */
export async function createProfile(previous: FormState, form: FormData): Promise<FormState> {
  const contacts = contactSlots
    .map((i) => ({
      slot: i,
      name: String(form.get(`contactName${i}`) ?? "").trim(),
      email: String(form.get(`contactEmail${i}`) ?? "").trim(),
      role: String(form.get(`contactRole${i}`) ?? "family"),
    }))
    .filter((c) => c.name || c.email);

  const parsed = createProfileSchema.safeParse({ ...Object.fromEntries(form), contacts });
  if (!parsed.success) {
    const [group, index, property] = parsed.error.issues[0]?.path ?? [];
    const contact = group === "contacts" && typeof index === "number" ? contacts[index] : undefined;
    const prefix = property === "name" ? "contactName" : property === "email" ? "contactEmail" : "contactRole";
    const field = contact ? `${prefix}${contact.slot}` : undefined;
    return formError(previous, parsed.error, form, setupFields, { field });
  }
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

/** Checks the care code and passcode before opening the matching role. */
export async function signIn(previous: FormState, form: FormData): Promise<FormState> {
  const fail = (error: FormIssue, field?: string) => formError(previous, error, form, ["profileId"], { field });
  const parsed = loginSchema.safeParse({
    profileId: String(form.get("profileId") ?? "")
      .trim()
      .toLowerCase(),
    passcode: form.get("passcode"),
  });
  if (!parsed.success) return fail(parsed.error);
  const { profileId, passcode } = parsed.data;

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limitKey = `${ip}|${profileId}`;
  if (!loginLimiter().allow(limitKey)) {
    return fail("Too many attempts. Please wait 15 minutes and try again.");
  }

  const profile = await repo().getProfile(profileId);
  // Check every role so the time taken does not reveal which passcodes exist.
  const matches = profile
    ? await Promise.all(ROLES.map((r) => verifyPasscode(passcode, profile.passcodeHashes[r])))
    : [];
  const role = ROLES.find((_, i) => matches[i]);
  if (!profile || !role) return fail("That care code and passcode do not match.", "passcode");

  loginLimiter().reset(limitKey);
  await startSession(profile.id, role);
  redirect("/circle");
}

/** Clears the current care circle session and returns home. */
export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
