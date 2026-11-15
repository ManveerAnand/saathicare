import { timingSafeEqual } from "node:crypto";
import { runReminderJob } from "@/lib/reminderJob";
import { mailer, repo } from "@/lib/server";

export const dynamic = "force-dynamic";

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Called every 15 minutes by a scheduler (GitHub Actions or Vercel Cron) with the CRON_SECRET. */
export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runReminderJob(repo(), mailer());
  return Response.json(result);
}
