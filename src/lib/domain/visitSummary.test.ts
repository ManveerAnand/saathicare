import { describe, expect, it } from "vitest";
import { buildVisitSummary } from "./visitSummary";
import { makeMedication, makeProfile } from "./fixtures";
import type { DoseLog } from "./types";

const profile = makeProfile();
const now = new Date("2026-11-15T10:00:00Z"); // 15:30 IST on the 15th
// 08:00 and 20:00 IST, starting on the 12th: 3 full past days plus today's morning.
const med = makeMedication({ startDate: "2026-11-12" });

function taken(scheduledFor: string, status: DoseLog["status"] = "taken"): DoseLog {
  return { id: scheduledFor, medicationId: "met", scheduledFor, status, loggedAt: scheduledFor, loggedBy: "elder" };
}

const mornings = ["2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"].map((d) => taken(`${d}T02:30:00.000Z`));
const prevEvenings = (d: string) => `${d}T14:30:00.000Z`;

describe("buildVisitSummary", () => {
  it("reports adherence per medicine and finds the hardest dose time", () => {
    // All mornings taken; evenings of the 12th and 13th missed, 14th taken.
    const logs = [...mornings, taken(prevEvenings("2026-11-14"))];
    const s = buildVisitSummary(profile, [med], logs, [], now, 30);

    const [report] = s.medications;
    expect(report).toMatchObject({ taken: 5, missed: 2, skipped: 0, percent: 71 });
    expect(report.hardestTime).toEqual({ time: "20:00", missed: 2 });
    expect(s.overallPercent).toBe(71);
    expect(s.patterns).toContain("Most missed doses are in the evening: 2 of 2.");
    expect(s.patterns).toContain("Metformin at 20:00 was missed 2 times.");
    expect(s.questions.some((q) => q.includes("evening doses"))).toBe(true);
    expect(s.questions.some((q) => q.startsWith("Metformin was taken 71%"))).toBe(true);
  });

  it("calls out deliberate skips and courses that are ending", () => {
    const course = makeMedication({ startDate: "2026-11-12", endDate: "2026-11-18" });
    const logs = [
      ...mornings,
      taken(prevEvenings("2026-11-12"), "skipped"),
      taken(prevEvenings("2026-11-13"), "skipped"),
      taken(prevEvenings("2026-11-14")),
    ];
    const s = buildVisitSummary(profile, [course], logs, [], now, 30);
    expect(s.patterns).toContain("Metformin was deliberately skipped 2 times.");
    expect(s.questions).toContain("Metformin is planned to end on 2026-11-18. Should it continue?");
  });

  it("reassures when there is nothing to worry about", () => {
    const logs = [...mornings, ...["2026-11-12", "2026-11-13", "2026-11-14"].map((d) => taken(prevEvenings(d)))];
    const s = buildVisitSummary(profile, [med], logs, [], now, 30);
    expect(s.overallPercent).toBe(100);
    expect(s.patterns).toEqual(["No worrying patterns: doses are being taken regularly."]);
    expect(s.questions).toEqual([]);
  });

  it("handles a circle with no medicines yet", () => {
    const s = buildVisitSummary(profile, [], [], [], now, 30);
    expect(s).toMatchObject({
      overallPercent: null,
      medications: [],
      patterns: [],
      questions: [],
      nextAppointment: null,
    });
    expect(s.from).toBe("2026-10-17");
    expect(s.to).toBe("2026-11-15");
  });
});
