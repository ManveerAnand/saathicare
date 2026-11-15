import { MedicationForm, ScanForm } from "@/components/forms";
import { geminiConfigured } from "@/lib/ai/gemini";
import type { Medication } from "@/lib/domain/types";
import { MedicineCard } from "./MedicineCard";

interface Props {
  medications: Medication[];
  elderName: string;
  today: string;
  editable: boolean;
}

/** All active medicines, plus the ways to add one (by hand or from a photo) for editors. */
export function MedicinesSection({ medications, elderName, today, editable }: Props) {
  const aiReady = geminiConfigured();
  return (
    <section className="card" aria-labelledby="medicines">
      <h2 id="medicines">Medicines</h2>
      {medications.length === 0 && <p>No medicines yet.</p>}
      <div className="grid">
        {medications.map((m) => (
          <MedicineCard key={m.id} medication={m} today={today} editable={editable} canExplain={aiReady} />
        ))}
      </div>
      {editable ? (
        <div className="grid medicine-adders">
          <details>
            <summary>Add a medicine by hand</summary>
            <MedicationForm today={today} />
          </details>
          {aiReady && (
            <details>
              <summary>Add from a prescription photo</summary>
              <ScanForm today={today} />
            </details>
          )}
        </div>
      ) : (
        <p className="muted read-only-note">
          {elderName} has chosen who can change medicines. You can still confirm doses.
        </p>
      )}
    </section>
  );
}
