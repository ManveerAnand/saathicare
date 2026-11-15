"use server";

import { revalidatePath } from "next/cache";
import { explainMedication, extractMedications, geminiConfigured } from "@/lib/ai/gemini";
import { detectImageType } from "@/lib/ai/image";
import { logError } from "@/lib/log";
import { aiLimiter, repo } from "@/lib/server";
import { requireEditor, requireSession } from "./session";
import type { ScanState } from "./types";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Generates a plain-language explanation for a medicine in the signed-in circle. */
export async function explain(form: FormData): Promise<void> {
  const session = await requireSession();
  const id = String(form.get("id") ?? "");
  const med = id ? await repo().getMedication(session.profileId, id) : null;
  // Cached on the medication, so Gemini is asked once per medicine, not on every view.
  if (!med || med.explanation || !geminiConfigured()) return;
  if (!aiLimiter("explain").allow(`${session.profileId}|${session.role}`)) return;
  try {
    const text = await explainMedication(med.name, med.dosage, med.instructions);
    if (text) await repo().setExplanation(session.profileId, id, text);
  } catch (err) {
    // A slow or failed answer is not saved; the button stays so the person can try again.
    logError("explain", err);
  }
  revalidatePath("/circle");
}

/** Validates a prescription image and returns drafts for the caretaker to review. */
export async function scanPrescription(_prev: ScanState, form: FormData): Promise<ScanState> {
  const session = await requireEditor();
  if (!session) return { error: "The elder has not allowed your role to add medicines." };
  if (!geminiConfigured()) return { error: "Prescription reading is not set up on this server." };

  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo first." };
  if (!IMAGE_TYPES.has(file.type)) return { error: "Use a JPEG, PNG or WebP photo." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "The photo must be under 4 MB." };
  if (!aiLimiter("scan").allow(`${session.profileId}|${session.role}`)) {
    return { error: "Too many photos. Please try again in 10 minutes or add the medicine by hand." };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    if (detectImageType(bytes) !== file.type) return { error: "Use a JPEG, PNG or WebP photo." };
    const drafts = await extractMedications(bytes.toString("base64"), file.type);
    return drafts.length
      ? { drafts, ok: `Found ${drafts.length}. Check each one, then save it.` }
      : { error: "No medicines could be read clearly. Try a sharper photo, or add them by hand." };
  } catch (err) {
    logError("scan", err);
    return { error: "Reading the photo failed. Please try again or add medicines by hand." };
  }
}
