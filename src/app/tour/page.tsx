import type { Metadata } from "next";
import Link from "next/link";
import { enterDemo } from "@/app/actions/demo";
import { SubmitButton } from "@/components/forms";
import type { Role } from "@/lib/domain/types";
import { STEPS } from "./steps";

export const metadata: Metadata = {
  title: "2-minute tour | SaathiCare",
  description: "A guided walk through SaathiCare for judges and first-time visitors.",
};

const ROLE_LABEL: Record<Role, string> = { elder: "elder", caretaker: "caretaker", family: "family" };

/** Shows the guided tour with links into the shared demo roles. */
export default function TourPage() {
  return (
    <div className="tour">
      <p className="eyebrow">For judges and first-time visitors</p>
      <h1>A 2-minute tour of SaathiCare</h1>
      <p className="lead">
        Six short stops through the shared demo circle of Kamala Devi, 72, her caretaker Asha and her son Ravi. Each
        step opens the demo in the right role. Use your browser&apos;s back button to return here.
      </p>

      <ol className="tour-steps">
        {STEPS.map((step, i) => (
          <li key={step.title} className="card tour-step">
            <div className="tour-number" aria-hidden="true">
              {i + 1}
            </div>
            <div>
              <h2>{step.title}</h2>
              <ul>
                {step.doThis.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="tour-why">
                <strong>Why it matters:</strong> {step.why}
              </p>
              {step.role && (
                <form action={enterDemo}>
                  <input type="hidden" name="role" value={step.role} />
                  <SubmitButton className={i === 0 ? undefined : "secondary"}>
                    Open the demo as {ROLE_LABEL[step.role]}
                  </SubmitButton>
                </form>
              )}
            </div>
          </li>
        ))}
      </ol>

      <section className="card" aria-labelledby="under-the-hood">
        <h2 id="under-the-hood">Under the hood</h2>
        <ul>
          <li>
            <strong>Reminders:</strong> a job every 15 minutes emails the elder before each dose and when one is missed;
            caretakers and family only after the elder&apos;s chosen delay. Each email is sent exactly once. (The demo
            circle is never emailed.)
          </li>
          <li>
            <strong>Security:</strong> passcodes hashed with scrypt, signed httpOnly sessions, server-side permission
            checks, validated input, rate-limited sign-in and strict security headers.
          </li>
          <li>
            <strong>Quality:</strong> the care rules are plain, tested TypeScript; 80+ automated tests run on every
            push.
          </li>
        </ul>
        <p>
          <a href="https://github.com/ManveerAnand/saathicare">Read the code on GitHub</a> ·{" "}
          <Link href="/setup">Start your own care circle</Link>
        </p>
      </section>
    </div>
  );
}
