import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppointmentsCard } from "@/components/circle/AppointmentsCard";
import { CareAssistant } from "@/components/circle/CareAssistant";
import { CareSummary } from "@/components/circle/CareSummary";
import { ChoicesCard } from "@/components/circle/ChoicesCard";
import { DemoBanner } from "@/components/circle/DemoBanner";
import { DoseTimeline } from "@/components/circle/DoseTimeline";
import { MedicinesSection } from "@/components/circle/MedicinesSection";
import { SignOutButton } from "@/components/circle/SignOutButton";
import { WeekTrend } from "@/components/circle/WeekTrend";
import { WelcomeNotice } from "@/components/circle/WelcomeNotice";
import { careInsights } from "@/lib/domain/assistant";
import { canEdit, canManageAccess } from "@/lib/domain/permissions";
import { adherence, dosesForDate } from "@/lib/domain/schedule";
import { addDays, localDate, zonedToUtc } from "@/lib/domain/time";
import { currentSession, repo } from "@/lib/server";

export const metadata: Metadata = { title: "Care circle | SaathiCare" };

/** Shows doses, appointments and medicines for the signed-in care circle. */
export default async function CirclePage({ searchParams }: PageProps<"/circle">) {
  const session = await currentSession();
  if (!session) redirect("/");
  const profile = await repo().getProfile(session.profileId);
  if (!profile) redirect("/");

  const now = new Date();
  const tz = profile.timeZone;
  const today = localDate(now, tz);
  const weekStart = zonedToUtc(addDays(today, -6), "00:00", tz).toISOString();

  const [meds, logs, appointments] = await Promise.all([
    repo().listMedications(profile.id),
    repo().listDoseLogs(profile.id, weekStart),
    repo().listAppointments(profile.id, now.toISOString()),
  ]);
  const doses = dosesForDate(meds, logs, today, tz, now);
  const week = adherence(meds, logs, tz, now, 7);
  const role = session.role;
  const editable = canEdit(profile, role);
  const welcome = (await searchParams).welcome;
  const insights = careInsights({ profile, viewer: role, todaysDoses: doses, meds, week, appointments, now });

  return (
    <div className={role === "elder" ? "elder-mode" : undefined}>
      {welcome && <WelcomeNotice careCode={profile.id} />}
      {profile.isDemo && <DemoBanner role={role} />}
      <CareSummary
        profile={profile}
        role={role}
        now={now}
        doses={doses}
        week={week}
        nextAppointment={appointments[0]}
      />
      <CareAssistant insights={insights} />
      <DoseTimeline doses={doses} editable={editable} />
      <div className="grid">
        <WeekTrend week={week} />
        <AppointmentsCard appointments={appointments} tz={tz} today={today} editable={editable} />
      </div>
      <MedicinesSection medications={meds} elderName={profile.elderName} today={today} editable={editable} />
      {canManageAccess(role) && <ChoicesCard permissions={profile.permissions} />}
      <SignOutButton />
    </div>
  );
}
