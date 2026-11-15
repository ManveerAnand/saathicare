"use client";

import { useFormStatus } from "react-dom";

/** Disables submission while its form action is pending. */
export function SubmitButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? "Working…" : children}
    </button>
  );
}
