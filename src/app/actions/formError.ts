import type { ZodError } from "zod";
import { firstError } from "@/lib/validation";
import type { FormState } from "./types";

export type FormIssue = string | ZodError;

/** Returns an error and restores only the allowed, non-secret fields. */
export function formError(
  previous: FormState,
  cause: FormIssue,
  form: FormData,
  fields: readonly string[],
  options: { field?: string; values?: Record<string, string> } = {},
): FormState {
  const values = { ...options.values };
  for (const name of fields) {
    const value = form.get(name);
    if (typeof value === "string") values[name] = value;
  }
  const path = typeof cause === "string" ? undefined : cause.issues[0]?.path[0];
  const field = options.field ?? (typeof path === "string" ? path : undefined);
  const error = typeof cause === "string" ? cause : firstError(cause);
  return { error, field, values, errorCount: (previous.errorCount ?? 0) + 1 };
}
