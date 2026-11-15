import { remindersDue } from "./domain/reminders";
import { addDays, localDate, zonedToUtc } from "./domain/time";
import type { Mailer } from "./notify/email";
import type { Repo } from "./repo/types";

export interface JobResult {
  profiles: number;
  sent: number;
  failed: number;
}

/**
 * Sends every reminder that is due. Safe to run as often as you like: each reminder is
 * recorded after it is sent, so a repeated run sends nothing new.
 */
export async function runReminderJob(repo: Repo, mailer: Mailer, now = new Date()): Promise<JobResult> {
  const ids = await repo.listProfileIds();
  let sent = 0;
  let failed = 0;

  for (const id of ids) {
    const profile = await repo.getProfile(id);
    if (!profile) continue;
    const since = zonedToUtc(addDays(localDate(now, profile.timeZone), -1), "00:00", profile.timeZone);
    const [meds, logs, appts] = await Promise.all([
      repo.listMedications(id),
      repo.listDoseLogs(id, since.toISOString()),
      repo.listAppointments(id, now.toISOString()),
    ]);

    const candidates = remindersDue(profile, meds, logs, appts, new Set(), now);
    const already = await repo.sentReminderKeys(id, candidates.map((r) => r.key));
    const delivered: string[] = [];

    for (const r of candidates.filter((c) => !already.has(c.key))) {
      try {
        await mailer.send(r.to, r.subject, r.text);
        delivered.push(r.key);
      } catch (err) {
        failed += 1;
        console.error(`[reminders] send failed for profile ${id}:`, (err as Error).message);
      }
    }
    if (delivered.length) await repo.markRemindersSent(id, delivered);
    sent += delivered.length;
  }

  return { profiles: ids.length, sent, failed };
}
