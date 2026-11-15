import { createHmac, timingSafeEqual } from "node:crypto";
import { ROLES, type Role } from "../domain/types";

export interface Session {
  profileId: string;
  role: Role;
  /** Expiry, in milliseconds since the epoch. */
  exp: number;
}

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Encodes a session as "payload.signature", both base64url. */
export function createToken(session: Session, secret: string): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/** Returns the session if the signature is valid and it has not expired; otherwise null. */
export function readToken(token: string | undefined, secret: string, now = Date.now()): Session | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (typeof s.profileId !== "string" || !ROLES.includes(s.role) || typeof s.exp !== "number") {
      return null;
    }
    return s.exp > now ? s : null;
  } catch {
    return null;
  }
}
