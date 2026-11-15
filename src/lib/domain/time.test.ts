import { describe, expect, it } from "vitest";
import { addDays, isValidTimeZone, localDate, offsetMinutes, zonedToUtc } from "./time";

describe("time zones", () => {
  it("converts IST wall-clock time to UTC", () => {
    expect(zonedToUtc("2026-11-15", "08:00", "Asia/Kolkata").toISOString()).toBe("2026-11-15T02:30:00.000Z");
  });

  it("handles a time that falls on the previous UTC day", () => {
    expect(zonedToUtc("2026-11-15", "01:00", "Asia/Kolkata").toISOString()).toBe("2026-11-14T19:30:00.000Z");
  });

  it("respects daylight saving time", () => {
    expect(zonedToUtc("2026-07-01", "09:00", "America/New_York").toISOString()).toBe("2026-07-01T13:00:00.000Z");
    expect(zonedToUtc("2026-12-01", "09:00", "America/New_York").toISOString()).toBe("2026-12-01T14:00:00.000Z");
  });

  it("reports offsets and local dates", () => {
    const instant = new Date("2026-11-14T20:00:00Z");
    expect(offsetMinutes(instant, "Asia/Kolkata")).toBe(330);
    expect(localDate(instant, "Asia/Kolkata")).toBe("2026-11-15");
  });

  it("adds days across month ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("validates time zone names", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});
