import type { FormState } from "./types";

export function formError(
  previous: FormState,
  error: string,
  form: FormData,
  fields: readonly string[],
  extraValues: Record<string, string> = {},
): FormState {
  const values = { ...extraValues };
  for (const field of fields) {
    const value = form.get(field);
    if (typeof value === "string") values[field] = value;
  }
  return { error, values, errorCount: (previous.errorCount ?? 0) + 1 };
}
