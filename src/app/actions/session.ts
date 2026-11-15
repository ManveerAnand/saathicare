import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createToken, SESSION_TTL_MS, type Session } from "@/lib/auth/token";
import { canEdit } from "@/lib/domain/permissions";
import type { Role } from "@/lib/domain/types";
import { env } from "@/lib/env";
import { currentSession, repo, SESSION_COOKIE, sessionSecret } from "@/lib/server";

/** Signs the person in by setting the session cookie. */
export async function startSession(profileId: string, role: Role) {
  const session: Session = { profileId, role, exp: Date.now() + SESSION_TTL_MS };
  (await cookies()).set(SESSION_COOKIE, createToken(session, sessionSecret()), {
    httpOnly: true,
    secure: env().NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

/** The signed-in session, or a redirect to the sign-in page. */
export async function requireSession(): Promise<Session> {
  const session = await currentSession();
  if (!session) redirect("/");
  return session;
}

/** The session, if this role may edit the care plan. */
export async function requireEditor(): Promise<Session | null> {
  const session = await requireSession();
  const profile = await repo().getProfile(session.profileId);
  return profile && canEdit(profile, session.role) ? session : null;
}
