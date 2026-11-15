import Link from "next/link";
import { redirect } from "next/navigation";
import { enterDemo } from "@/app/actions/demo";
import { SignInForm, SubmitButton } from "@/components/forms";
import { ProgressRing } from "@/components/ProgressRing";
import { currentSession, repo } from "@/lib/server";

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
            One shared plan for medicines, doses and doctor visits. Everyone stays informed, and the
            elder decides who can change what, and when family is told about a missed dose.
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

      <section className="features" aria-label="What SaathiCare does">
        <Feature title="One tap: taken" icon="check">
          Big, clear buttons for every dose. Anyone in the circle can confirm, so family can help from afar.
        </Feature>
        <Feature title="Snap a prescription" icon="camera">
          Gemini reads the photo and drafts each medicine. Nothing is saved until a person checks it.
        </Feature>
        <Feature title="Reminders that respect people" icon="bell">
          Email before each dose. If one is missed, the elder hears first; family only after the delay they chose.
        </Feature>
        <Feature title="A Care Assistant" icon="spark">
          Plain guidance from the day&apos;s context: missed doses, double-dose risks, visits to prepare for.
        </Feature>
      </section>

      <section className="charter" aria-labelledby="charter">
        <h2 id="charter">The elder&apos;s charter</h2>
        <ol>
          <li>I decide who may change my medicines and appointments.</li>
          <li>I am reminded first. Others are told only after the time I choose.</li>
          <li>I can always see and correct my own plan.</li>
          <li>Nobody, human or AI, changes my dose without my doctor.</li>
        </ol>
      </section>

      <section className="grid" aria-label="Get started">
        <div className="card">
          <h2 id="signin">Open your care circle</h2>
          <SignInForm />
        </div>
        <div className="card">
          <h2>New here?</h2>
          <p className="lead">Set up a circle together with the elder in about a minute. You choose three passcodes: one each for the elder, caretakers and family.</p>
          <Link className="button big" href="/setup">
            Start a care circle
          </Link>
        </div>
      </section>
    </>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
};

function Feature({ title, icon, children }: { title: string; icon: keyof typeof ICONS; children: React.ReactNode }) {
  return (
    <article className="card feature">
      <div className="icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {ICONS[icon]}
        </svg>
      </div>
      <h3>{title}</h3>
      <p className="muted">{children}</p>
    </article>
  );
}
