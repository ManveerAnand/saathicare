import { describe, expect, it } from "vitest";
import { DEMO_PROFILE_ID, ensureDemoCircle } from "./demo";
import { adherence } from "./domain/schedule";
import { buildVisitSummary } from "./domain/visitSummary";
import { runReminderJob } from "./reminderJob";
import { MemoryRepo } from "./repo/memory";

const hashes = { elder: "a", caretaker: "b", family: "c" };
const now = new Date("2026-11-15T07:00:00Z"); // 12:30 IST

describe("ensureDemoCircle", () => {
  it("seeds a lived-in circle: medicines, a week of history and appointments", async () => {
    const repo = new MemoryRepo();
    const profile = await ensureDemoCircle(repo, hashes, now);
    expect(profile).toMatchObject({ id: DEMO_PROFILE_ID, isDemo: true });

    const meds = await repo.listMedications(profile.id);
    expect(meds).toHaveLength(4);
    expect(await repo.listAppointments(profile.id, now.toISOString())).toHaveLength(2);

    const logs = await repo.listDoseLogs(profile.id, "2026-11-01T00:00:00.000Z");
    const week = adherence(meds, logs, profile.timeZone, now, 7);
    expect(week.missed).toBeGreaterThanOrEqual(3);
    expect(week.percent).toBeGreaterThan(70);
    expect(week.percent).toBeLessThan(100);
  });

  it("fills a month of history, so the visit summary shows a real evening pattern", async () => {
    const repo = new MemoryRepo();
    const profile = await ensureDemoCircle(repo, hashes, now);
    const meds = await repo.listMedications(profile.id);
    const logs = await repo.listDoseLogs(profile.id, "2026-10-01T00:00:00.000Z");
    const summary = buildVisitSummary(profile, meds, logs, [], now, 30);
    expect(summary.overallPercent).toBeGreaterThan(90);
    expect(summary.patterns[0]).toMatch(/^Most missed doses are in the evening/);
  });

  it("is idempotent and keeps a visitor's changes", async () => {
    const repo = new MemoryRepo();
    await ensureDemoCircle(repo, hashes, now);
    const [med] = await repo.listMedications(DEMO_PROFILE_ID);
    await repo.deactivateMedication(DEMO_PROFILE_ID, med.id);

    await ensureDemoCircle(repo, hashes, now);
    expect(await repo.listMedications(DEMO_PROFILE_ID)).toHaveLength(3);
    expect(await repo.listAppointments(DEMO_PROFILE_ID, now.toISOString())).toHaveLength(2);
  });

  it("is never emailed by the reminder job", async () => {
    const repo = new MemoryRepo();
    await ensureDemoCircle(repo, hashes, now);
    const sent: string[] = [];
    const result = await runReminderJob(repo, { send: async (_to, s) => void sent.push(s) }, now);
    expect(result.sent).toBe(0);
    expect(sent).toEqual([]);
  });
});
