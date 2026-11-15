import { describe, expect, it } from "vitest";
import { MemoryRepo } from "./memory";

const base = { dosage: "5 mg", instructions: "", times: ["08:00"], startDate: "2026-11-01", updatedBy: "elder" as const };

describe("MemoryRepo", () => {
  it("lists medicines by name, ignoring case, then by id", async () => {
    const repo = new MemoryRepo();
    await repo.saveMedication("p", { ...base, name: "metformin", id: "b" });
    await repo.saveMedication("p", { ...base, name: "Amlodipine", id: "z" });
    await repo.saveMedication("p", { ...base, name: "Metformin", id: "a" });
    expect((await repo.listMedications("p")).map((m) => m.id)).toEqual(["z", "a", "b"]);
  });

  it("clearCareData removes care records of that profile only", async () => {
    const repo = new MemoryRepo();
    for (const id of ["p", "q"]) {
      await repo.saveMedication(id, { ...base, name: "Metformin" });
      await repo.saveAppointment(id, { doctor: "Dr", purpose: "x", location: "y", at: "2026-12-01T00:00:00.000Z", updatedBy: "elder" });
      await repo.markRemindersSent(id, ["k"]);
    }
    await repo.clearCareData("p");
    expect(await repo.listMedications("p")).toHaveLength(0);
    expect(await repo.listAppointments("p", "2026-01-01T00:00:00.000Z")).toHaveLength(0);
    expect((await repo.sentReminderKeys("p", ["k"])).size).toBe(0);
    expect(await repo.listMedications("q")).toHaveLength(1);
  });
});
