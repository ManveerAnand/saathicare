import type { ExtractedMedication } from "@/lib/validation";

/** Result of a form action: an error to show, or a confirmation. */
export interface FormState {
  error?: string;
  field?: string;
  ok?: string;
  values?: Record<string, string>;
  errorCount?: number;
}

/** Result of reading a prescription photo: the draft medicines, if any were found. */
export interface ScanState extends FormState {
  drafts?: ExtractedMedication[];
}
