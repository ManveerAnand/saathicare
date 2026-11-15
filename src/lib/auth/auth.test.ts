import { describe, expect, it } from "vitest";
import { hashPasscode, verifyPasscode } from "./passcode";
import { RateLimiter } from "./rateLimit";
import { createToken, readToken } from "./token";
import { canEdit, canManageAccess } from "../domain/permissions";
import { makeProfile } from "../domain/fixtures";

describe("passcodes", () => {
  it("verifies the right passcode and rejects others", async () => {
    const stored = await hashPasscode("246810");
    expect(stored).not.toContain("246810");
    expect(await verifyPasscode("246810", stored)).toBe(true);
    expect(await verifyPasscode("246811", stored)).toBe(false);
    expect(await verifyPasscode("246810", "garbage")).toBe(false);
  });

  it("salts each hash", async () => {
    expect(await hashPasscode("123456")).not.toBe(await hashPasscode("123456"));
  });
});

describe("session tokens", () => {
  const secret = "test-secret-that-is-long-enough-123";
  const session = { profileId: "abc12345", role: "family" as const, exp: Date.now() + 60_000 };

  it("round-trips a valid token", () => {
    expect(readToken(createToken(session, secret), secret)).toEqual(session);
  });

  it("rejects tampered, foreign and expired tokens", () => {
    const token = createToken(session, secret);
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...session, role: "elder" })).toString("base64url");
    expect(readToken(`${forged}.${sig}`, secret)).toBeNull();
    expect(readToken(token, "another-secret")).toBeNull();
    expect(readToken(`${payload}.`, secret)).toBeNull();
    expect(readToken(token, secret, session.exp + 1)).toBeNull();
    expect(readToken(undefined, secret)).toBeNull();
  });
});

describe("rate limiter", () => {
  it("blocks after the limit until the window passes", () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.allow("ip", 0)).toBe(true);
    expect(limiter.allow("ip", 1)).toBe(true);
    expect(limiter.allow("ip", 2)).toBe(false);
    expect(limiter.allow("ip", 1001)).toBe(true);
  });

  it("limits each key independently", () => {
    const limiter = new RateLimiter(1, 1000);
    expect(limiter.allow("first", 0)).toBe(true);
    expect(limiter.allow("first", 1)).toBe(false);
    expect(limiter.allow("second", 1)).toBe(true);
  });

  it("resets a key before the window expires", () => {
    const limiter = new RateLimiter(1, 1000);
    expect(limiter.allow("first", 0)).toBe(true);
    limiter.reset("first");
    expect(limiter.allow("first", 1)).toBe(true);
  });
});

describe("permissions", () => {
  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])("enforces the elder's access choices (caretaker %s, family %s)", (caretakerCanEdit, familyCanEdit) => {
    const profile = makeProfile({ permissions: { caretakerCanEdit, familyCanEdit, escalateAfterMinutes: 30 } });
    expect(canEdit(profile, "elder")).toBe(true);
    expect(canEdit(profile, "caretaker")).toBe(caretakerCanEdit);
    expect(canEdit(profile, "family")).toBe(familyCanEdit);
    expect(canManageAccess("elder")).toBe(true);
    expect(canManageAccess("caretaker")).toBe(false);
    expect(canManageAccess("family")).toBe(false);
  });
});
