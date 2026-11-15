import type { Profile, Role } from "./types";

/** Whether this role may add, edit or delete medications and appointments. */
export function canEdit(profile: Profile, role: Role): boolean {
  if (role === "elder") return true;
  if (role === "caretaker") return profile.permissions.caretakerCanEdit;
  return profile.permissions.familyCanEdit;
}

/** Only the elder changes who can do what. */
export function canManageAccess(role: Role): boolean {
  return role === "elder";
}
