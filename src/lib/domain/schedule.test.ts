import { describe, expect, it } from "vitest";
import { adherence, dosesForDate } from "./schedule";
import { makeMedication } from "./fixtures";
import type { DoseLog } from "./types";

const TZ = "Asia/Kolkata";
const morning = "2026-11-15T02:30:00.000Z"; // 08:00 IST

function log(scheduledFor: string, status: DoseLog["status"] = "taken"): DoseLog {
  return { id: scheduledFor, medicationId: "met", scheduledFor, status, loggedAt: scheduledFor, loggedBy: "elder" };
}

describe("dosesForDate", () => {
  it("lists each dose time in order with a status", () => {
    const now = new Date("2026-11-15T02:20:00Z"); // 07:50 IST
    const doses = dosesForDate([makeMedication()], [], "2026-11-15", TZ, now);
    expect(doses.map((d) => [d.localTime, d.status])).toEqual([
      ["08:00", "due"],
      ["20:00", "upcoming"],
    ]);
    expect(doses[0].scheduledFor).toBe(morning);
  });

  it("marks a dose missed an hour after its time, unless logged", () => {
    const now = new Date("2026-11-15T03:40:00Z"); // 09:10 IST
    expect(dosesForDate([makeMedication()], [], "2026-11-15", TZ, now)[0].status).toBe("missed");
    expect(dosesForDate([makeMedication()], [log(morning)], "2026-11-15", TZ, now)[0].status).toBe("taken");
  });

  it("skips inactive medications and dates outside the course", () => {
    const now = new Date("2026-11-15T00:00:00Z");
    expect(dosesForDate([makeMedication({ active: false })], [], "2026-11-15", TZ, now)).toEqual([]);
    expect(dosesForDate([makeMedication({ endDate: "2026-11-14" })], [], "2026-11-15", TZ, now)).toEqual([]);
    expect(dosesForDate([makeMedication({ startDate: "2026-11-16" })], [], "2026-11-15", TZ, now)).toEqual([]);
  });
});

describe("adherence", () => {
  it("counts only decided doses", () => {
    const now = new Date("2026-11-15T10:00:00Z"); // 15:30 IST: morning decided, evening not yet
    const result = adherence([makeMedication({ startDate: "2026-11-15" })], [log(morning)], TZ, now, 1);
    expect(result).toMatchObject({ taken: 1, missed: 0, percent: 100 });
  });

  it("reports missed and skipped doses over several days", () => {
    const now = new Date("2026-11-15T10:00:00Z");
    const med = makeMedication({ startDate: "2026-11-14" });
    const logs = [log("2026-11-14T02:30:00.000Z"), log("2026-11-14T14:30:00.000Z", "skipped")];
    const result = adherence([med], logs, TZ, now, 2);
    // 14th: taken + skipped. 15th: morning missed.
    expect(result).toMatchObject({ taken: 1, skipped: 1, missed: 1, percent: 33 });
    expect(result.daily).toEqual([
      { date: "2026-11-14", percent: 50 },
      { date: "2026-11-15", percent: 0 },
    ]);
  });

  it("returns null when nothing is decided yet", () => {
    const now = new Date("2026-11-15T00:00:00Z");
    expect(adherence([], [], TZ, now, 3).percent).toBeNull();
  });
});
