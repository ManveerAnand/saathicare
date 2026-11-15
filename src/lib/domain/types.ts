/** Who is using the shared profile. The elder always has the final say. */
export type Role = "elder" | "caretaker" | "family";

export const ROLES: readonly Role[] = ["elder", "caretaker", "family"] as const;

export interface Contact {
  name: string;
  email: string;
  role: Exclude<Role, "elder">;
}

/** What the elder lets each role do. The elder can always do everything. */
export interface Permissions {
  caretakerCanEdit: boolean;
  familyCanEdit: boolean;
  /** Minutes after a missed dose before caretakers and family are emailed. */
  escalateAfterMinutes: number;
}

export interface Profile {
  id: string;
  elderName: string;
  elderEmail: string;
  timeZone: string;
  contacts: Contact[];
  permissions: Permissions;
  /** scrypt hashes, one per role. Never the passcode itself. */
  passcodeHashes: Record<Role, string>;
  createdAt: string;
  /** The public demo circle: shown to visitors, never emailed. */
  isDemo?: boolean;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  /** Local times in the profile's time zone, "HH:MM". */
  times: string[];
  /** Inclusive local dates, "YYYY-MM-DD". */
  startDate: string;
  endDate?: string;
  active: boolean;
  /** Plain-language explanation from Gemini, cached so it is generated once. */
  explanation?: string;
  updatedBy: Role;
  updatedAt: string;
}

export type DoseStatus = "taken" | "skipped";

export interface DoseLog {
  id: string;
  medicationId: string;
  /** UTC ISO instant of the scheduled dose. */
  scheduledFor: string;
  status: DoseStatus;
  loggedAt: string;
  loggedBy: Role;
}

export interface Appointment {
  id: string;
  doctor: string;
  purpose: string;
  location: string;
  /** UTC ISO instant. */
  at: string;
  notes?: string;
  updatedBy: Role;
}

/** One scheduled dose, derived from a medication. Never stored. */
export interface Dose {
  medicationId: string;
  medicationName: string;
  dosage: string;
  scheduledFor: string;
  localTime: string;
  status: DoseStatus | "due" | "missed" | "upcoming";
}
