import { describe, expect, it } from "vitest";
import { greeting, period, PILL_COLOURS, pillColour, trendLabel } from "./presentation";

describe("pillColour", () => {
  it("is stable and always a palette colour", () => {
    expect(pillColour("med-1")).toBe(pillColour("med-1"));
    for (const id of ["a", "med-1", "metformin", ""]) expect(PILL_COLOURS).toContain(pillColour(id));
  });
});

describe("period", () => {
  it("splits the day at 12:00 and 17:00", () => {
    expect(period("11:59")).toBe("Morning");
    expect(period("12:00")).toBe("Afternoon");
    expect(period("16:59")).toBe("Afternoon");
    expect(period("17:00")).toBe("Evening");
  });
});

describe("greeting", () => {
  // 06:30 UTC is 12:00 in Kolkata and 06:30 in London (winter).
  const now = new Date("2025-01-15T06:30:00Z");

  it("uses the hour in the given time zone", () => {
    expect(greeting(now, "Asia/Kolkata")).toBe("Good afternoon");
    expect(greeting(now, "Europe/London")).toBe("Good morning");
    expect(greeting(new Date("2025-01-15T12:00:00Z"), "Asia/Kolkata")).toBe("Good evening");
  });
});

describe("trendLabel", () => {
  it("lists each day, with none for days without doses", () => {
    expect(
      trendLabel([
        { date: "2025-01-14", percent: 100 },
        { date: "2025-01-15", percent: null },
      ]),
    ).toBe("Doses taken per day: 2025-01-14 100%, 2025-01-15 none");
  });
});
