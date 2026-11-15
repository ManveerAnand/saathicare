import { logDose } from "@/app/actions/carePlan";
import type { Dose, DoseStatus } from "@/lib/domain/types";

interface Props {
  dose: Dose;
  /** The status this button records. */
  status: DoseStatus;
  ariaLabel: string;
  secondary?: boolean;
  children: React.ReactNode;
}

/** One button that logs a dose as taken or skipped. */
export function DoseActionForm({ dose, status, ariaLabel, secondary, children }: Props) {
  return (
    <form action={logDose}>
      <input type="hidden" name="medicationId" value={dose.medicationId} />
      <input type="hidden" name="scheduledFor" value={dose.scheduledFor} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={secondary ? "secondary" : undefined} aria-label={ariaLabel}>
        {children}
      </button>
    </form>
  );
}
