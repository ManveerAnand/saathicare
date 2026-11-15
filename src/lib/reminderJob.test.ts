import { describe, expect, it } from "vitest";
import { runReminderJob } from "./reminderJob";
import { MemoryRepo } from "./repo/memory";
import { makeMedication, makeProfile } from "./domain/fixtures";
import type { Mailer } from "./notify/email";

function recordingMailer(failFirst = false): Mailer & { subjects: string[] } {
  let calls = 0;
  const subjects: string[] = [];
  return {
    subjects,
    async send(_to, subject) {
      calls += 1;
      if (failFirst && calls === 1) throw new Error("smtp down");
      subjects.push(subject);
    },
  };
}

async function seed() {
  const repo = new MemoryRepo();
  const profile = await repo.createProfile(makeProfile());
  await repo.saveMedication(profile.id, makeMedication({ startDate: "2026-11-15", times: ["08:00"] }));
  return { repo, profile };
}

describe("runReminderJob", () => {
  it("sends a due reminder once, even when run twice", async () => {
    const { repo } = await seed();
    const mailer = recordingMailer();
    const now = new Date("2026-11-15T02:15:00Z");
    expect(await runReminderJob(repo, mailer, now)).toEqual({ profiles: 1, sent: 1, failed: 0 });
    expect(await runReminderJob(repo, mailer, now)).toEqual({ profiles: 1, sent: 0, failed: 0 });
    expect(mailer.subjects).toEqual(["Reminder: Metformin at 08:00"]);
  });

  it("retries a reminder that failed to send on the next run", async () => {
    const { repo } = await seed();
    const mailer = recordingMailer(true);
    const now = new Date("2026-11-15T02:15:00Z");
    expect((await runReminderJob(repo, mailer, now)).failed).toBe(1);
    expect((await runReminderJob(repo, mailer, now)).sent).toBe(1);
  });

  it("stops reminding once the dose is logged", async () => {
    const { repo, profile } = await seed();
    await repo.logDose(profile.id, {
      medicationId: (await repo.listMedications(profile.id))[0].id,
      scheduledFor: "2026-11-15T02:30:00.000Z",
      status: "taken",
      loggedAt: "2026-11-15T02:31:00.000Z",
      loggedBy: "elder",
    });
    const result = await runReminderJob(repo, recordingMailer(), new Date("2026-11-15T04:30:00Z"));
    expect(result.sent).toBe(0);
  });
});
