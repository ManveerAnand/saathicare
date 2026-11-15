"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPasscode } from "@/lib/auth/passcode";
import { canResetDemo, ensureDemoCircle, resetDemoCircle } from "@/lib/demo";
import { ROLES } from "@/lib/domain/types";
import { repo } from "@/lib/server";
import { requireSession, startSession } from "./session";

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
