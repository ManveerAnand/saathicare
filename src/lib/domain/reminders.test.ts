import { describe, expect, it } from "vitest";
import { remindersDue } from "./reminders";
import { makeMedication, makeProfile } from "./fixtures";
import type { Appointment } from "./types";

const profile = makeProfile();
const med = makeMedication({ startDate: "2026-11-15", times: ["08:00"] });

describe("remindersDue", () => {
  it("reminds only the elder shortly before a dose", () => {
    const now = new Date("2026-11-15T02:15:00Z"); // 07:45 IST
    const [r, ...rest] = remindersDue(profile, [med], [], [], new Set(), now);
    expect(rest).toEqual([]);
    expect(r).toMatchObject({ kind: "upcoming-dose", to: ["kamala@example.com"] });
  });

  it("tells the elder first when a dose is missed, and others only after the delay", () => {
    const missed = new Date("2026-11-15T03:35:00Z"); // 65 min late
    expect(remindersDue(profile, [med], [], [], new Set(), missed).map((r) => r.kind)).toEqual(["missed-dose"]);

    const later = new Date("2026-11-15T04:05:00Z"); // 95 min late, past 60 + 30
    const kinds = remindersDue(profile, [med], [], [], new Set(), later);
    const escalation = kinds.find((r) => r.kind === "escalation");
    expect(escalation?.to).toEqual(["ravi@example.com", "asha@example.com"]);
  });

  it("sends nothing for a dose that was taken", () => {
    const later = new Date("2026-11-15T04:05:00Z");
    const log = {
      id: "1",
      medicationId: "met",
      scheduledFor: "2026-11-15T02:30:00.000Z",
      status: "taken" as const,
      loggedAt: "x",
      loggedBy: "elder" as const,
    };
    expect(remindersDue(profile, [med], [log], [], new Set(), later)).toEqual([]);
  });

  it("never sends the same reminder twice", () => {
    const now = new Date("2026-11-15T02:15:00Z");
    const first = remindersDue(profile, [med], [], [], new Set(), now);
    const again = remindersDue(profile, [med], [], [], new Set(first.map((r) => r.key)), now);
    expect(again).toEqual([]);
  });

  it("emails everyone within 24 hours of an appointment", () => {
    const appt: Appointment = {
      id: "a1",
      doctor: "Dr. Rao",
      purpose: "Diabetes review",
      location: "City Clinic",
      at: "2026-11-16T05:30:00.000Z",
      updatedBy: "caretaker",
    };
    const now = new Date("2026-11-15T10:00:00Z");
    const [r] = remindersDue(profile, [], [], [appt], new Set(), now);
    expect(r).toMatchObject({ kind: "appointment" });
    expect(r.to).toHaveLength(3);
    expect(remindersDue(profile, [], [], [appt], new Set(), new Date("2026-11-14T00:00:00Z"))).toEqual([]);
  });
});
