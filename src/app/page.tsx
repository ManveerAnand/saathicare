import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/forms";
import { currentSession, repo } from "@/lib/server";

export default async function Home() {
  const session = await currentSession();
  // Check the profile too: a stale session for a deleted circle would otherwise loop.
  if (session && (await repo().getProfile(session.profileId))) redirect("/circle");

  return (
    <div className="grid">
      <section aria-labelledby="intro">
        <h1 id="intro">One care plan for the elder, their caretakers and family</h1>
        <p className="lead">
          SaathiCare keeps medicines, doses and doctor visits in one shared place. The elder stays in
          charge: they decide who can change things, and they are reminded first before anyone else is told.
        </p>
        <ul className="lead">
          <li>Each person signs in with their own passcode</li>
          <li>One tap to mark a dose as taken</li>
          <li>Email reminders for upcoming doses, missed doses and appointments</li>
          <li>Photograph a prescription and Gemini drafts the schedule for you to check</li>
        </ul>
        <p>
          <Link className="button secondary big" href="/setup">
            Start a new care circle
          </Link>
        </p>
      </section>

      <section className="card" aria-labelledby="signin">
        <h2 id="signin">Open your care circle</h2>
        <SignInForm />
      </section>
    </div>
  );
}
