import "server-only";
import { cookies } from "next/headers";
import { readToken, type Session } from "./auth/token";
import { RateLimiter } from "./auth/rateLimit";
import { consoleMailer, gmailMailer, type Mailer } from "./notify/email";
import { FirestoreRepo } from "./repo/firestore";
import { MemoryRepo } from "./repo/memory";
import type { Repo } from "./repo/types";

export const SESSION_COOKIE = "saathi_session";

// Module-level singletons survive across requests on a warm server instance.
const globalStore = globalThis as unknown as { __saathiRepo?: Repo; __saathiLimiter?: RateLimiter };

/** Firestore when configured; otherwise an in-memory store for local demos. */
export function repo(): Repo {
  if (!globalStore.__saathiRepo) {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    globalStore.__saathiRepo = sa ? FirestoreRepo.fromEnv(sa) : new MemoryRepo();
  }
  return globalStore.__saathiRepo;
}

/** Five passcode attempts per 15 minutes, per client and care code. */
export function loginLimiter(): RateLimiter {
  globalStore.__saathiLimiter ??= new RateLimiter(5, 15 * 60 * 1000);
  return globalStore.__saathiLimiter;
}

export function mailer(): Mailer {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  return GMAIL_USER && GMAIL_APP_PASSWORD ? gmailMailer(GMAIL_USER, GMAIL_APP_PASSWORD) : consoleMailer;
}

export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be at least 32 characters");
  return "dev-only-secret-do-not-use-in-production";
}

export async function currentSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return readToken(token, sessionSecret());
}
