import type { Medication, Profile } from "./types";

/** Shared test data. 08:00 and 20:00 IST are 02:30 and 14:30 UTC. */
export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "demo1234",
    elderName: "Kamala",
    elderEmail: "kamala@example.com",
    timeZone: "Asia/Kolkata",
    contacts: [
      { name: "Ravi", email: "ravi@example.com", role: "family" },
      { name: "Asha", email: "asha@example.com", role: "caretaker" },
    ],
    permissions: { caretakerCanEdit: true, familyCanEdit: false, escalateAfterMinutes: 30 },
    passcodeHashes: { elder: "x", caretaker: "y", family: "z" },
    createdAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

/** Creates a sample medication with optional test overrides. */
export function makeMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: "met",
    name: "Metformin",
    dosage: "500 mg",
    instructions: "After food",
    times: ["08:00", "20:00"],
    startDate: "2026-11-01",
    active: true,
    updatedBy: "caretaker",
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}
