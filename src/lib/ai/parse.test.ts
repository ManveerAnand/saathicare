import { expect, it } from "vitest";
import { parseExtraction } from "./parse";

const draft = { name: "Metformin", dosage: "500 mg", times: ["08:00"] };

it("returns validated drafts with optional values defaulted", () => {
  expect(parseExtraction(JSON.stringify({ medications: [draft] }))).toEqual([{ ...draft, instructions: "" }]);
});

it("drops drafts whose names are blank", () => {
  const medications = [{ ...draft, name: "  " }, draft];
  expect(parseExtraction(JSON.stringify({ medications }))).toHaveLength(1);
});

it.each([
  ["malformed JSON", "{medications:["],
  ["too many drafts", JSON.stringify({ medications: Array.from({ length: 21 }, () => draft) })],
  ["an invalid time", JSON.stringify({ medications: [draft, { ...draft, times: ["31:00"] }] })],
])("rejects %s safely", (_scenario, text) => {
  expect(parseExtraction(text)).toEqual([]);
});
