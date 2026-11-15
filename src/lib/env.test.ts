import { expect, it } from "vitest";
import { parseEnv } from "./env";

it("uses development defaults with no services configured", () => {
  expect(parseEnv({})).toMatchObject({
    GEMINI_MODEL: "gemini-3.5-flash-lite",
    SESSION_SECRET: "dev-only-secret-do-not-use-in-production",
  });
});

it.each([undefined, "too-short"])("rejects a missing or short production session secret", (secret) => {
  expect(() => parseEnv({ NODE_ENV: "production", SESSION_SECRET: secret })).toThrow(/SESSION_SECRET/);
});

it("allows missing or blank optional service variables", () => {
  const settings = parseEnv({
    NODE_ENV: "production",
    SESSION_SECRET: "x".repeat(32),
    GMAIL_USER: "",
    CRON_SECRET: "",
  });
  expect(settings.GMAIL_USER).toBeUndefined();
  expect(settings.CRON_SECRET).toBeUndefined();
  expect(settings.FIREBASE_SERVICE_ACCOUNT).toBeUndefined();
});

it("reports invalid optional settings by name only", () => {
  expect(() => parseEnv({ CRON_SECRET: "short-secret", GMAIL_USER: "bad-address" })).toThrow(
    "Invalid server configuration: CRON_SECRET, GMAIL_USER",
  );
});
