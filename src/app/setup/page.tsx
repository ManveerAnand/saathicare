import type { Metadata } from "next";
import { SetupForm } from "@/components/forms";

export const metadata: Metadata = { title: "Start a care circle | SaathiCare" };

export default function SetupPage() {
  return (
    <section className="card" aria-labelledby="setup">
      <h1 id="setup">Start a care circle</h1>
      <p className="lead">
        Set this up together with the elder. You will get a care code that everyone uses with their own passcode.
      </p>
      <SetupForm defaultTimeZone="Asia/Kolkata" />
    </section>
  );
}
