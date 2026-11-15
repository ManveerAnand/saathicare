import { expect, it, vi } from "vitest";
import { logError, logInfo } from "./log";

it("logs scoped errors without including details or converting unknown values to strings", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    logError("scan", new Error("private@example.test"));
    logError("scan", "private name");
    logError("scan", {
      toString: () => {
        throw new Error("Should not be invoked");
      },
    });
    expect(error.mock.calls).toEqual([["[scan] Error"], ["[scan] Error message withheld"], ["[scan] Unknown error"]]);
  } finally {
    error.mockRestore();
  }
});

it("formats an informational message with its scope", () => {
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    logInfo("email", "Appointment reminder");
    expect(info).toHaveBeenCalledWith("[email] Appointment reminder");
  } finally {
    info.mockRestore();
  }
});
