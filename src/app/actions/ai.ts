"use server";

import { revalidatePath } from "next/cache";
import { explainMedication, extractMedications, geminiConfigured } from "@/lib/ai/gemini";
import { repo } from "@/lib/server";
import { requireEditor, requireSession } from "./session";
import type { ScanState } from "./types";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function explain(form: FormData): Promise<void> {
  const session = await requireSession();
  const id = String(form.get("id") ?? "");
  const med = id ? await repo().getMedication(session.profileId, id) : null;
  // Cached on the medication, so Gemini is asked once per medicine, not on every view.
  if (!med || med.explanation || !geminiConfigured()) return;
  try {
    const text = await explainMedication(med.name, med.dosage, med.instructions);
    if (text) await repo().setExplanation(session.profileId, id, text);
  } catch (err) {
    // A slow or failed answer is not saved; the button stays so the person can try again.
    console.error("[explain] Gemini request failed:", (err as Error).message);
  }
  revalidatePath("/circle");
}

export async function scanPrescription(_prev: ScanState, form: FormData): Promise<ScanState> {
  const session = await requireEditor();
  if (!session) return { error: "The elder has not allowed your role to add medicines." };
  if (!geminiConfigured()) return { error: "Prescription reading is not set up on this server." };

  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo first." };
  if (!IMAGE_TYPES.has(file.type)) return { error: "Use a JPEG, PNG or WebP photo." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "The photo must be under 4 MB." };

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const drafts = await extractMedications(base64, file.type);
    return drafts.length
      ? { drafts, ok: `Found ${drafts.length}. Check each one, then save it.` }
      : { error: "No medicines could be read clearly. Try a sharper photo, or add them by hand." };
  } catch (err) {
    console.error("[scan] Gemini request failed:", (err as Error).message);
    return { error: "Reading the photo failed. Please try again or add medicines by hand." };
  }
}
