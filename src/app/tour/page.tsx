import type { Metadata } from "next";
import Link from "next/link";
import { enterDemo } from "@/app/actions";
import { SubmitButton } from "@/components/forms";
import type { Role } from "@/lib/domain/types";

export const metadata: Metadata = {
  title: "2-minute tour | SaathiCare",
  description: "A guided walk through SaathiCare for judges and first-time visitors.",
};

interface Step {
  title: string;
  role?: Role;
  doThis: string[];
  why: string;
}

const STEPS: Step[] = [
  {
    title: "See the day through the elder's eyes",
    role: "elder",
    doThis: [
      "Read the greeting and the ring: how many of today's doses are done.",
      "The Care Assistant (top) warns that the 08:00 Amoxicillin was missed and the next dose is soon: do not take two together.",
      "Press ✓ Taken on that dose. The ring, the timeline and the warning update.",
    ],
    why: "Big, plain controls for older hands and eyes; guidance from rules that never tell anyone to change a dose.",
  },
  {
    title: "The elder decides who can do what",
    role: "elder",
    doThis: [
      "Scroll to “Your choices” at the bottom.",
      "These switches decide whether caretakers and family may edit the plan, and how long to wait before others hear about a missed dose.",
    ],
    why: "The problem asks to keep elders at the centre of their own decisions. Only the elder sees this section.",
  },
  {
    title: "Switch to the family view",
    role: "family",
    doThis: [
      "The heading becomes “How is Kamala doing?”: today's progress, the week's adherence and the next visit at a glance.",
      "There are no edit forms: the elder has not allowed family to edit. Family can still confirm a dose, which is how help from afar works.",
    ],
    why: "Every role signs in with its own passcode, and every change is checked on the server.",
  },
  {
    title: "Add medicines as a caretaker",
    role: "caretaker",
    doThis: [
      "Under Medicines, open “Add from a prescription photo” and upload a photo of a prescription or medicine strip. Gemini drafts each medicine; nothing is saved until you press “Confirm and add”.",
      "Or open “Add a medicine by hand”: name, dose, up to four daily times, start and end dates.",
      "Press “What is this for?” on any medicine for a three-sentence explanation written for an elderly reader.",
    ],
    why: "AI handles the messy input (photos, plain language); people stay in control of what is saved.",
  },
  {
    title: "Prepare for the doctor",
    role: "caretaker",
    doThis: [
      "In “Upcoming visits”, press “Prepare for the doctor”.",
      "A printable 30-day summary shows adherence per medicine, the hardest dose time (Metformin at 20:00), patterns and questions to ask.",
      "Press “Print or save as PDF” to see the clean printed version.",
    ],
    why: "Elders often cannot recall a month of doses in a short appointment; this gives the doctor facts, not guesses.",
  },
  {
    title: "Try it at a larger size, or on a phone",
    doThis: [
      "Use A+ or A++ at the top right: the whole app scales, and the choice is remembered.",
      "Open the site on a phone: every screen is designed for one hand and large text.",
    ],
    why: "The body font, Atkinson Hyperlegible, was designed by the Braille Institute for readers with low vision.",
  },
];

const ROLE_LABEL: Record<Role, string> = { elder: "elder", caretaker: "caretaker", family: "family" };

export default function TourPage() {
  return (
    <div className="tour">
      <p className="eyebrow">For judges and first-time visitors</p>
      <h1>A 2-minute tour of SaathiCare</h1>
      <p className="lead">
        Six short stops through the shared demo circle of Kamala Devi, 72, her caretaker Asha and her son Ravi.
        Each step opens the demo in the right role. Use your browser&apos;s back button to return here.
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
            <strong>Security:</strong> passcodes hashed with scrypt, signed httpOnly sessions, server-side permission checks,
            validated input, rate-limited sign-in and strict security headers.
          </li>
          <li>
            <strong>Quality:</strong> the care rules are plain, tested TypeScript; 80+ automated tests run on every push.
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
