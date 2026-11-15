import { explain } from "@/app/actions/ai";
import { removeMedication } from "@/app/actions/carePlan";
import { MedicationForm } from "@/components/forms";
import type { Medication } from "@/lib/domain/types";
import { pillColour } from "@/lib/presentation";

interface Props {
  medication: Medication;
  today: string;
  editable: boolean;
  /** Whether Gemini is set up, so "What is this for?" can be offered. */
  canExplain: boolean;
}

/** One medicine: its schedule, a plain-language explanation, and edit or stop for editors. */
export function MedicineCard({ medication: m, today, editable, canExplain }: Props) {
  return (
    <article className="card flat medicine-card">
      <div className="row">
        <span className="pill" style={{ background: pillColour(m.id) }} aria-hidden="true">
          {m.name.charAt(0)}
        </span>
        <div>
          <h3 className="flush">{m.name}</h3>
          <div className="muted">
            {m.dosage} · {m.times.join(", ")}
            {m.endDate && ` · until ${m.endDate}`}
          </div>
        </div>
      </div>
      {m.instructions && <p className="medicine-instructions">{m.instructions}</p>}
      {m.explanation ? (
        <p className="notice info">
          <span className="sr-only">What this medicine is for: </span>
          {m.explanation}
        </p>
      ) : (
        canExplain && (
          <form action={explain}>
            <input type="hidden" name="id" value={m.id} />
            <button type="submit" className="secondary">
              What is this for?
            </button>
          </form>
        )
      )}
      {editable && (
        <details>
          <summary>Edit {m.name}</summary>
          <MedicationForm medication={m} today={today} />
          <form action={removeMedication}>
            <input type="hidden" name="id" value={m.id} />
            <button type="submit" className="danger">
              Stop this medicine
            </button>
          </form>
        </details>
      )}
    </article>
  );
}
