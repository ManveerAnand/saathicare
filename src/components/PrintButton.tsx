"use client";

/** Opens the browser print dialog for the visit summary. */
export function PrintButton() {
  return (
    <button type="button" className="big no-print" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
