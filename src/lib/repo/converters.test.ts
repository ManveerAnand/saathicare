import { expect, it } from "vitest";
import { makeMedication, makeProfile } from "../domain/fixtures";
import { appointmentConverter, doseLogConverter, medicationConverter, profileConverter } from "./converters";

it("round trips a profile and strips undefined document fields, including nested fields", () => {
  const profile = makeProfile();
  const doc = profileConverter.toFirestore({
    ...profile,
    isDemo: undefined,
    contacts: profile.contacts.map((contact) => ({ ...contact, extra: undefined })),
  });
  expect(doc).toStrictEqual(profile);
  expect(profileConverter.fromFirestore({ data: () => doc })).toEqual(profile);
});

it("round trips medication documents and rejects incomplete records", () => {
  const med = makeMedication({ explanation: "An example explanation" });
  const doc = medicationConverter.toFirestore({ ...med, endDate: undefined });
  expect(doc).toStrictEqual(med);
  expect(medicationConverter.fromFirestore({ data: () => doc })).toEqual(med);
  expect(() => medicationConverter.fromFirestore({ data: () => ({ id: med.id, active: "yes" }) })).toThrow();
});

it("round trips appointment and dose log documents", () => {
  const appointment = {
    id: "a",
    doctor: "Dr Test",
    purpose: "Check-up",
    location: "Clinic",
    at: "2026-11-15T00:00:00.000Z",
    updatedBy: "elder",
  };
  const dose = {
    id: "d",
    medicationId: "m",
    scheduledFor: appointment.at,
    status: "taken",
    loggedAt: appointment.at,
    loggedBy: "elder",
  };
  expect(appointmentConverter.fromFirestore({ data: () => appointmentConverter.toFirestore(appointment) })).toEqual(
    appointment,
  );
  expect(doseLogConverter.fromFirestore({ data: () => doseLogConverter.toFirestore(dose) })).toEqual(dose);
});
