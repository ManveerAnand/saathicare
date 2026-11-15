import Link from "next/link";
import { redirect } from "next/navigation";
import { enterDemo } from "@/app/actions/demo";
import { SignInForm, SubmitButton } from "@/components/forms";
import { Charter } from "@/components/landing/Charter";
import { Features } from "@/components/landing/Features";
import { ProgressRing } from "@/components/ProgressRing";
import { currentSession, repo } from "@/lib/server";

/** Shows the public overview and entry points to a care circle. */
export default async function Home() {
  const session = await currentSession();
  // Check the profile too: a stale session for a deleted circle would otherwise loop.
  if (session && (await repo().getProfile(session.profileId))) redirect("/circle");

  return (
    <>
      <section className="hero" aria-labelledby="intro">
        <div>
          <p className="eyebrow">For elders, caretakers and family</p>
          <h1 id="intro">
            Care that keeps <em>Amma</em> in charge.
          </h1>
          <p className="lead">
            One shared plan for medicines, doses and doctor visits. Everyone stays informed, and the elder decides who
            can change what, and when family is told about a missed dose.
          </p>
          <div className="demo-choices" aria-label="Try the live demo">
            <form action={enterDemo}>
              <input type="hidden" name="role" value="elder" />
              <SubmitButton className="big">Try the demo as the elder</SubmitButton>
            </form>
            <form action={enterDemo}>
              <input type="hidden" name="role" value="family" />
              <SubmitButton className="big secondary">…as family</SubmitButton>
            </form>
            <form action={enterDemo}>
              <input type="hidden" name="role" value="caretaker" />
              <SubmitButton className="big secondary">…as caretaker</SubmitButton>
            </form>
          </div>
          <p className="muted">
            No sign-up: the demo circle is shared sample data. Or <Link href="/setup">start your own circle</Link>.
          </p>
          <p>
            <Link className="tour-cta" href="/tour">
              Judging? Take the 2-minute guided tour →
            </Link>
          </p>
        </div>

        <div className="preview" aria-hidden="true">
          <div className="card">
            <div className="row">
              <ProgressRing done={3} total={5} />
              <div>
                <p className="eyebrow">Today</p>
                <p className="display preview-title">Good afternoon, Kamala</p>
                <p className="muted flush">Next: Amoxicillin at 14:00</p>
              </div>
            </div>
          </div>
          <div className="dose" data-status="due">
            <span className="pill preview-pill">A</span>
            <div>
              <div className="dose-time">14:00</div>
              <div className="dose-name">Amoxicillin · 500 mg</div>
            </div>
            <span className="button">✓ Taken</span>
          </div>
          <div className="insight urgent preview-insight">
            <span className="dot" />
            The 08:00 Metformin was missed. The next dose is at 20:00: do not take two together.
          </div>
        </div>
      </section>

      <Features />
      <Charter />

      <section className="grid" aria-label="Get started">
        <div className="card">
          <h2 id="signin">Open your care circle</h2>
          <SignInForm />
        </div>
        <div className="card">
          <h2>New here?</h2>
          <p className="lead">
            Set up a circle together with the elder in about a minute. You choose three passcodes: one each for the
            elder, caretakers and family.
          </p>
          <Link className="button big" href="/setup">
            Start a care circle
          </Link>
        </div>
      </section>
    </>
  );
}
