"use client";

import { useActionState, useState } from "react";
import { scanPrescription } from "@/app/actions/ai";
import type { ScanState } from "@/app/actions/types";
import { MedicationForm } from "./MedicationForm";
import { Status } from "./Status";
import { SubmitButton } from "./SubmitButton";

/** Uploads a prescription photo and lets the caretaker review each draft. */
export function ScanForm({ today }: { today: string }) {
  const [state, action] = useActionState<ScanState, FormData>(scanPrescription, {});
  const [name, setName] = useState("");
  return (
    <div>
      <form action={action}>
        <label htmlFor="photo">Photo of a prescription or medicine label</label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          required
          onChange={(e) => setName(e.target.files?.[0]?.name ?? "")}
        />
        {name && <p className="hint">Selected: {name}</p>}
        <SubmitButton>Read with Gemini</SubmitButton>
      </form>
      <Status state={state} />
      {state.drafts?.map((d, i) => (
        <div className="card" key={`${d.name}-${i}`}>
          <h3>Draft {i + 1}: check before saving</h3>
          <MedicationForm draft={d} today={today} />
        </div>
      ))}
    </div>
  );
}
