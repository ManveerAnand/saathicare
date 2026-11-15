"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { hashPasscode, verifyPasscode } from "@/lib/auth/passcode";
import { ROLES } from "@/lib/domain/types";
import { loginLimiter, repo, SESSION_COOKIE } from "@/lib/server";
import { createProfileSchema, firstError, loginSchema } from "@/lib/validation";
import { formError } from "./formError";
import { startSession } from "./session";
import type { FormState } from "./types";

const contactSlots = [0, 1, 2];
const setupFields = [
  "elderName", "elderEmail", "timeZone",
  ...contactSlots.flatMap((i) => [`contactName${i}`, `contactEmail${i}`, `contactRole${i}`]),
];

export async function createProfile(previous: FormState, form: FormData): Promise<FormState> {
  const contacts = contactSlots
    .map((i) => ({
      name: String(form.get(`contactName${i}`) ?? "").trim(),
      email: String(form.get(`contactEmail${i}`) ?? "").trim(),
      role: String(form.get(`contactRole${i}`) ?? "family"),
    }))
    .filter((c) => c.name || c.email);

  const parsed = createProfileSchema.safeParse({ ...Object.fromEntries(form), contacts });
  if (!parsed.success) return formError(previous, firstError(parsed.error), form, setupFields);
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

export async function signIn(previous: FormState, form: FormData): Promise<FormState> {
  const fail = (error: string) => formError(previous, error, form, ["profileId"]);
  const parsed = loginSchema.safeParse({
    profileId: String(form.get("profileId") ?? "").trim().toLowerCase(),
    passcode: form.get("passcode"),
  });
  if (!parsed.success) return fail(firstError(parsed.error));
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
  if (!profile || !role) return fail("That care code and passcode do not match.");

  loginLimiter().reset(limitKey);
  await startSession(profile.id, role);
  redirect("/circle");
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
