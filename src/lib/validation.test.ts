import { describe, expect, it } from "vitest";
import {
  appointmentSchema,
  createProfileSchema,
  doseLogSchema,
  extractedMedicationsSchema,
  firstError,
  loginSchema,
  medicationSchema,
  passcodeSchema,
  permissionsSchema,
} from "./validation";

describe("passcodeSchema", () => {
  it.each(["123456", "123456789012"])("accepts %s", (v) => {
    expect(passcodeSchema.safeParse(v).success).toBe(true);
  });
  it.each(["12345", "1234567890123", "12345a", "abcdef", ""])("rejects %j", (v) => {
    expect(passcodeSchema.safeParse(v).success).toBe(false);
  });
});

describe("createProfileSchema", () => {
  const valid = {
    elderName: "  Asha Rao  ",
    elderEmail: "asha@example.com",
    timeZone: "Asia/Kolkata",
    elderPasscode: "111111",
    caretakerPasscode: "222222",
    familyPasscode: "333333",
  };

  it("accepts a valid profile and defaults contacts to []", () => {
    const r = createProfileSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data?.contacts).toEqual([]);
  });

  it("trims the elder name", () => {
    expect(createProfileSchema.parse(valid).elderName).toBe("Asha Rao");
  });

  it("rejects duplicate role passcodes, pointing at familyPasscode", () => {
    const r = createProfileSchema.safeParse({ ...valid, familyPasscode: "111111" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["familyPasscode"]);
  });

  it("rejects an unknown time zone", () => {
    expect(createProfileSchema.safeParse({ ...valid, timeZone: "Mars/Olympus" }).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(createProfileSchema.safeParse({ ...valid, elderEmail: "nope" }).success).toBe(false);
  });

  it("rejects more than 10 contacts", () => {
    const contacts = Array.from({ length: 11 }, (_, i) => ({
      name: `C${i}`,
      email: `c${i}@example.com`,
      role: "family" as const,
    }));
    expect(createProfileSchema.safeParse({ ...valid, contacts }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts a lowercase alphanumeric care code", () => {
    expect(loginSchema.safeParse({ profileId: "xkgu2jem", passcode: "123456" }).success).toBe(true);
  });
  it.each(["ABCDEF12", "abc12", "abc-1234", "a".repeat(33)])("rejects care code %s", (profileId) => {
    expect(loginSchema.safeParse({ profileId, passcode: "123456" }).success).toBe(false);
  });
});

describe("medicationSchema", () => {
  const valid = {
    name: "Metformin",
    dosage: "500mg",
    times: ["08:00", "20:00"],
    startDate: "2026-11-01",
  };

  it("accepts a valid medication; endDate optional, instructions default to empty", () => {
    const r = medicationSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data?.instructions).toBe("");
    expect(r.data?.endDate).toBeUndefined();
  });

  it.each(["25:00", "8:00", "08:60", "0800"])("rejects time %s", (t) => {
    expect(medicationSchema.safeParse({ ...valid, times: [t] }).success).toBe(false);
  });

  it("requires at least one time", () => {
    expect(medicationSchema.safeParse({ ...valid, times: [] }).success).toBe(false);
  });

  it("rejects an endDate before startDate", () => {
    const r = medicationSchema.safeParse({ ...valid, endDate: "2026-10-31" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["endDate"]);
  });

  it("accepts endDate equal to startDate", () => {
    expect(medicationSchema.safeParse({ ...valid, endDate: "2026-11-01" }).success).toBe(true);
  });

  it("rejects a non YYYY-MM-DD start date", () => {
    expect(medicationSchema.safeParse({ ...valid, startDate: "01/11/2026" }).success).toBe(false);
  });
});

describe("appointmentSchema", () => {
  const valid = {
    doctor: "Dr. Mehta",
    purpose: "Check-up",
    location: "City Clinic",
    date: "2026-12-01",
    time: "10:30",
  };

  it("accepts a valid appointment and defaults notes to empty", () => {
    expect(appointmentSchema.parse(valid).notes).toBe("");
  });
  it("rejects a blank doctor after trimming", () => {
    expect(appointmentSchema.safeParse({ ...valid, doctor: "   " }).success).toBe(false);
  });
  it("rejects an invalid time", () => {
    expect(appointmentSchema.safeParse({ ...valid, time: "24:00" }).success).toBe(false);
  });
});

describe("doseLogSchema", () => {
  const valid = { medicationId: "med1", scheduledFor: "2026-11-15T02:30:00Z", status: "taken" };

  it.each(["taken", "skipped"])("accepts status %s", (status) => {
    expect(doseLogSchema.safeParse({ ...valid, status }).success).toBe(true);
  });
  it("rejects other statuses", () => {
    expect(doseLogSchema.safeParse({ ...valid, status: "missed" }).success).toBe(false);
  });
  it("rejects a non-ISO scheduledFor", () => {
    expect(doseLogSchema.safeParse({ ...valid, scheduledFor: "tomorrow" }).success).toBe(false);
  });
});

describe("permissionsSchema", () => {
  const base = { caretakerCanEdit: true, familyCanEdit: false };

  it.each([0, 30, 1440])("accepts escalateAfterMinutes %i", (n) => {
    expect(permissionsSchema.safeParse({ ...base, escalateAfterMinutes: n }).success).toBe(true);
  });
  it.each([-1, 1441, 1.5])("rejects escalateAfterMinutes %d", (n) => {
    expect(permissionsSchema.safeParse({ ...base, escalateAfterMinutes: n }).success).toBe(false);
  });
});

describe("extractedMedicationsSchema", () => {
  it("defaults instructions to '' and times to []", () => {
    const r = extractedMedicationsSchema.parse({ medications: [{ name: "Aspirin", dosage: "75mg" }] });
    expect(r.medications[0]).toMatchObject({ instructions: "", times: [] });
  });

  it("rejects more than 20 medications", () => {
    const medications = Array.from({ length: 21 }, () => ({ name: "A", dosage: "1mg" }));
    expect(extractedMedicationsSchema.safeParse({ medications }).success).toBe(false);
  });

  it("rejects invalid extracted times", () => {
    const r = extractedMedicationsSchema.safeParse({
      medications: [{ name: "A", dosage: "1mg", times: ["morning"] }],
    });
    expect(r.success).toBe(false);
  });
});

describe("firstError", () => {
  it("formats 'path: message' for a nested issue", () => {
    const r = medicationSchema.safeParse({
      name: "X",
      dosage: "1",
      times: ["25:00"],
      startDate: "2026-11-01",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstError(r.error)).toBe("times.0: Use HH:MM");
  });

  it("falls back to 'input' when the path is empty", () => {
    const r = passcodeSchema.safeParse("abc");
    if (!r.success) expect(firstError(r.error)).toBe("input: Use 6 to 12 digits");
  });
});
