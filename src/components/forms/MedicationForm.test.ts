import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { makeMedication } from "@/lib/domain/fixtures";
import { MedicationForm } from "./MedicationForm";

vi.mock("@/app/actions/carePlan", () => ({ saveMedication: vi.fn() }));

const draft = { name: "Metformin", dosage: "500 mg", instructions: "" };
const longerSchedule = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
const cases: [string, Omit<ComponentProps<typeof MedicationForm>, "today">, string[]][] = [
  ["adding by hand", {}, ["08:00", "", "", ""]],
  ["editing a medicine", { medication: makeMedication({ times: ["14:30"] }) }, ["14:30", "", "", ""]],
  ["confirming a draft", { draft: { ...draft, times: ["08:00", "20:00"] } }, ["08:00", "20:00", "", ""]],
  ["confirming a draft without times", { draft: { ...draft, times: [] } }, ["", "", "", ""]],
  ["editing a longer schedule", { medication: makeMedication({ times: longerSchedule }) }, longerSchedule],
];

it.each(cases)("shows the correct time fields when %s", (_name, props, expected) => {
  const html = renderToStaticMarkup(createElement(MedicationForm, { today: "2026-11-15", ...props }));
  const inputTags = html.match(/<input\b[^>]*\btype="time"[^>]*>/g) ?? [];
  expect(inputTags.map((tag) => tag.match(/\bvalue="([^"]*)"/)?.[1])).toEqual(expected);
});
