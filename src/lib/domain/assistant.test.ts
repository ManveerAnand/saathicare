import { describe, expect, it } from "vitest";
import { careInsights, type AssistantContext } from "./assistant";
import { makeMedication, makeProfile } from "./fixtures";
import type { Dose } from "./types";

const now = new Date("2026-11-15T10:00:00Z"); // 15:30 IST

function dose(localTime: string, scheduledFor: string, status: Dose["status"]): Dose {
  return { medicationId: "met", medicationName: "Metformin", dosage: "500 mg", localTime, scheduledFor, status };
}

function ctx(overrides: Partial<AssistantContext> = {}): AssistantContext {
  return {
    profile: makeProfile(),
    viewer: "elder",
    todaysDoses: [],
    meds: [],
    week: { taken: 0, missed: 0, skipped: 0, percent: null, daily: [] },
    appointments: [],
    now,
    ...overrides,
  };
}

describe("careInsights", () => {
  it("warns against doubling up when the next dose is close", () => {
    const doses = [dose("14:00", "2026-11-15T08:30:00.000Z", "missed"), dose("18:00", "2026-11-15T12:30:00.000Z", "upcoming")];
    const [first] = careInsights(ctx({ todaysDoses: doses }));
    expect(first.level).toBe("urgent");
    expect(first.message).toContain("Do not take two doses together");
  });

  it("speaks to the elder directly and about the elder to family", () => {
    const doses = [dose("08:00", "2026-11-15T02:30:00.000Z", "missed")];
    expect(careInsights(ctx({ todaysDoses: doses }))[0].message).toMatch(/^You have not marked/);
    expect(careInsights(ctx({ todaysDoses: doses, viewer: "family" }))[0].message).toMatch(/^Kamala has not marked/);
  });

  it("flags low adherence only with enough doses to judge", () => {
    const low = { taken: 2, missed: 3, skipped: 0, percent: 40, daily: [] };
    expect(careInsights(ctx({ week: low })).some((i) => i.message.includes("40%"))).toBe(true);
    const tooFew = { taken: 0, missed: 1, skipped: 0, percent: 0, daily: [] };
    expect(careInsights(ctx({ week: tooFew }))).toEqual([]);
  });

  it("reminds about an appointment within two days, and courses ending soon", () => {
    const insights = careInsights(
      ctx({
        appointments: [{ id: "a", doctor: "Dr. Rao", purpose: "Review", location: "Clinic", at: "2026-11-16T05:30:00.000Z", notes: "fasting", updatedBy: "elder" }],
        meds: [makeMedication({ endDate: "2026-11-17" })],
      }),
    );
    expect(insights.map((i) => i.level)).toEqual(["info", "info"]);
    expect(insights[0].message).toContain("Dr. Rao");
    expect(insights[0].message).toContain("fasting");
    expect(insights[1].message).toContain("2026-11-17");
  });

  it("celebrates a completed day and orders urgent items first", () => {
    const done = careInsights(ctx({ todaysDoses: [dose("08:00", "2026-11-15T02:30:00.000Z", "taken")] }));
    expect(done).toEqual([{ level: "good", message: "All of today's doses are done. Well done!" }]);

    const mixed = careInsights(
      ctx({
        todaysDoses: [dose("15:20", "2026-11-15T09:50:00.000Z", "due"), dose("08:00", "2026-11-15T02:30:00.000Z", "missed")],
      }),
    );
    expect(mixed.map((i) => i.level)).toEqual(["urgent", "attention"]);
  });
});
