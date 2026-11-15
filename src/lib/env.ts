import "server-only";
import { z } from "zod";

const devSecret = "dev-only-secret-do-not-use-in-production";
const schema = z.object({
  NODE_ENV: z.string().optional(),
  SESSION_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(16).optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite"),
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),
  GMAIL_USER: z.email().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
});

/** Validates runtime configuration without exposing values in errors. */
export function parseEnv(source: Readonly<Record<string, string | undefined>>) {
  const { NODE_ENV, SESSION_SECRET } = source;
  const parsed = schema.safeParse({
    NODE_ENV,
    SESSION_SECRET: NODE_ENV === "production" || (SESSION_SECRET?.length ?? 0) >= 32 ? SESSION_SECRET : devSecret,
    CRON_SECRET: source.CRON_SECRET || undefined,
    GEMINI_API_KEY: source.GEMINI_API_KEY || undefined,
    GEMINI_MODEL: source.GEMINI_MODEL,
    FIREBASE_SERVICE_ACCOUNT: source.FIREBASE_SERVICE_ACCOUNT || undefined,
    GMAIL_USER: source.GMAIL_USER || undefined,
    GMAIL_APP_PASSWORD: source.GMAIL_APP_PASSWORD || undefined,
  });
  if (!parsed.success)
    throw new Error(`Invalid server configuration: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
  return parsed.data;
}

let configuration: z.infer<typeof schema> | undefined;

/** Loads configuration on first runtime use. */
export function env() {
  return (configuration ??= parseEnv(process.env));
}
