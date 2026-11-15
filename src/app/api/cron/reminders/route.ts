import { isAuthorizedCronRequest } from "@/lib/auth/cron";
import { env } from "@/lib/env";
import { runReminderJob } from "@/lib/reminderJob";
import { mailer, repo } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Called every 15 minutes by a scheduler (GitHub Actions or Vercel Cron) with the CRON_SECRET. */
export async function GET(request: Request) {
  const header = request.headers.get("authorization");
  if (!header || !isAuthorizedCronRequest(header, env().CRON_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runReminderJob(repo(), mailer());
  return Response.json(result);
}
