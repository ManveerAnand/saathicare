import { extractedMedicationsSchema, type ExtractedMedication } from "../validation";

/** Returns only validated, named drafts from model output. */
export function parseExtraction(text: string): ExtractedMedication[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }

  const parsed = extractedMedicationsSchema.safeParse(data);
  return parsed.success ? parsed.data.medications.filter((med) => med.name.trim()) : [];
}
