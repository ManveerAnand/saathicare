import { describe, expect, it } from "vitest";
import { canResetDemo, DEMO_PROFILE_ID, ensureDemoCircle, resetDemoCircle } from "./demo";
import { adherence } from "./domain/schedule";
import { makeProfile } from "./domain/fixtures";
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

  it("is idempotent and does not duplicate the defaults", async () => {
    const repo = new MemoryRepo();
    await ensureDemoCircle(repo, hashes, now);
    await ensureDemoCircle(repo, hashes, now);
    await Promise.all([ensureDemoCircle(repo, hashes, now), ensureDemoCircle(repo, hashes, now)]);
    expect(await repo.listMedications(DEMO_PROFILE_ID)).toHaveLength(4);
    expect(await repo.listAppointments(DEMO_PROFILE_ID, now.toISOString())).toHaveLength(2);
  });

  it("recreates a stopped default medicine with its history", async () => {
    const repo = new MemoryRepo();
    await ensureDemoCircle(repo, hashes, now);
    const metformin = (await repo.listMedications(DEMO_PROFILE_ID)).find((m) => m.name === "Metformin")!;
    await repo.deactivateMedication(DEMO_PROFILE_ID, metformin.id);
    expect(await repo.listMedications(DEMO_PROFILE_ID)).toHaveLength(3);

    await ensureDemoCircle(repo, hashes, now);
    const meds = await repo.listMedications(DEMO_PROFILE_ID);
    expect(meds).toHaveLength(4);
    const back = meds.find((m) => m.name === "Metformin")!;
    expect(back.times).toEqual(["08:00", "20:00"]);
    const logs = await repo.listDoseLogs(DEMO_PROFILE_ID, "2026-10-01T00:00:00.000Z");
    expect(adherence([back], logs, "Asia/Kolkata", now, 30).percent).toBeGreaterThan(80);
  });

  it("keeps medicines and dose marks that visitors added", async () => {
    const repo = new MemoryRepo();
    await ensureDemoCircle(repo, hashes, now);
    const extra = await repo.saveMedication(DEMO_PROFILE_ID, {
      name: "Vitamin D",
      dosage: "1000 IU",
      instructions: "",
      times: ["10:00"],
      startDate: "2026-11-15",
      updatedBy: "elder",
    });
    const [dose] = (await repo.listDoseLogs(DEMO_PROFILE_ID, "2026-11-15T00:00:00.000Z")).slice(0, 1);
    await repo.logDose(DEMO_PROFILE_ID, { ...dose, status: "skipped", loggedBy: "family" });

    await ensureDemoCircle(repo, hashes, now);
    const meds = await repo.listMedications(DEMO_PROFILE_ID);
    expect(meds).toHaveLength(5);
    expect(meds.some((m) => m.id === extra.id)).toBe(true);
    const logs = await repo.listDoseLogs(DEMO_PROFILE_ID, "2026-11-15T00:00:00.000Z");
    expect(logs.find((l) => l.id === dose.id)?.status).toBe("skipped");
  });

  it("restores the default permissions on every entry", async () => {
    const repo = new MemoryRepo();
    await ensureDemoCircle(repo, hashes, now);
    await repo.updatePermissions(DEMO_PROFILE_ID, {
      caretakerCanEdit: false,
      familyCanEdit: true,
      escalateAfterMinutes: 120,
    });

    const profile = await ensureDemoCircle(repo, hashes, now);
    const expected = { caretakerCanEdit: true, familyCanEdit: false, escalateAfterMinutes: 30 };
    expect(profile.permissions).toEqual(expected);
    expect((await repo.getProfile(DEMO_PROFILE_ID))?.permissions).toEqual(expected);
  });

  it("resets the demo: visitor changes go and the full demo is back", async () => {
    const repo = new MemoryRepo();
    await ensureDemoCircle(repo, hashes, now);
    await repo.saveMedication(DEMO_PROFILE_ID, {
      name: "Vitamin D",
      dosage: "1000 IU",
      instructions: "",
      times: ["10:00"],
      startDate: "2026-11-15",
      updatedBy: "elder",
    });
    for (const a of await repo.listAppointments(DEMO_PROFILE_ID, now.toISOString()))
      await repo.deleteAppointment(DEMO_PROFILE_ID, a.id);
    await repo.updatePermissions(DEMO_PROFILE_ID, {
      caretakerCanEdit: false,
      familyCanEdit: true,
      escalateAfterMinutes: 120,
    });

    await resetDemoCircle(repo, DEMO_PROFILE_ID, hashes, now);
    const meds = await repo.listMedications(DEMO_PROFILE_ID);
    expect(meds.map((m) => m.name)).toEqual(["Amlodipine", "Amoxicillin", "Atorvastatin", "Metformin"]);
    expect(await repo.listAppointments(DEMO_PROFILE_ID, now.toISOString())).toHaveLength(2);
    expect((await repo.getProfile(DEMO_PROFILE_ID))?.permissions.caretakerCanEdit).toBe(true);
    const logs = await repo.listDoseLogs(DEMO_PROFILE_ID, "2026-10-01T00:00:00.000Z");
    expect(adherence(meds, logs, "Asia/Kolkata", now, 30).percent).toBeGreaterThan(90);
  });

  it("refuses to reset any circle but the demo, and deletes nothing", async () => {
    const repo = new MemoryRepo();
    const real = await repo.ensureProfile(makeProfile({ id: "real1234" }));
    await repo.saveMedication(real.id, {
      name: "Metformin",
      dosage: "500 mg",
      instructions: "",
      times: ["08:00"],
      startDate: "2026-11-01",
      updatedBy: "elder",
    });

    expect(canResetDemo(DEMO_PROFILE_ID)).toBe(true);
    expect(canResetDemo(real.id)).toBe(false);
    expect(canResetDemo("")).toBe(false);
    await expect(resetDemoCircle(repo, real.id, hashes, now)).rejects.toThrow();
    expect(await repo.listMedications(real.id)).toHaveLength(1);
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
