import type { Dose } from "@/lib/domain/types";
import { pillColour, STATUS_LABEL } from "@/lib/presentation";
import { DoseActionForm } from "./DoseActionForm";

/** One scheduled dose, with Taken and Skip buttons while it can still be logged. */
export function DoseCard({ dose }: { dose: Dose }) {
  const loggable = dose.status !== "taken" && dose.status !== "upcoming";
  return (
    <li className="dose" data-status={dose.status}>
      <span className="pill" style={{ background: pillColour(dose.medicationId) }} aria-hidden="true">
        {dose.medicationName.charAt(0)}
      </span>
      <div>
        <div className="row dose-meta">
          <span className="dose-time">{dose.localTime}</span>
          <span className={`badge ${dose.status}`}>{STATUS_LABEL[dose.status]}</span>
        </div>
        <div className="dose-name">
          {dose.medicationName} <span className="muted">· {dose.dosage}</span>
        </div>
      </div>
      {loggable && (
        <div className="dose-actions">
          <DoseActionForm
            dose={dose}
            status="taken"
            ariaLabel={`Mark ${dose.medicationName} at ${dose.localTime} as taken`}
          >
            ✓ Taken
          </DoseActionForm>
          {dose.status !== "skipped" && (
            <DoseActionForm
              dose={dose}
              status="skipped"
              ariaLabel={`Skip ${dose.medicationName} at ${dose.localTime}`}
              secondary
            >
              Skip
            </DoseActionForm>
          )}
        </div>
      )}
    </li>
  );
}
