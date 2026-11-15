import type { Role } from "@/lib/domain/types";

interface Step {
  title: string;
  role?: Role;
  doThis: string[];
  why: string;
}

export const STEPS: Step[] = [
  {
    title: "See the day through the elder's eyes",
    role: "elder",
    doThis: [
      "Read the greeting and the ring: how many of today's doses are done.",
      "The Care Assistant (top) warns that the 08:00 Amoxicillin was missed and the next dose is soon: do not take two together.",
      "Press ✓ Taken on that dose. The ring, the timeline and the warning update.",
    ],
    why: "Big, plain controls for older hands and eyes; guidance from rules that never tell anyone to change a dose.",
  },
  {
    title: "The elder decides who can do what",
    role: "elder",
    doThis: [
      "Scroll to “Your choices” at the bottom.",
      "These switches decide whether caretakers and family may edit the plan, and how long to wait before others hear about a missed dose.",
    ],
    why: "The problem asks to keep elders at the centre of their own decisions. Only the elder sees this section.",
  },
  {
    title: "Switch to the family view",
    role: "family",
    doThis: [
      "The heading becomes “How is Kamala doing?”: today's progress, the week's adherence and the next visit at a glance.",
      "There are no edit forms: the elder has not allowed family to edit. Family can still confirm a dose, which is how help from afar works.",
    ],
    why: "Every role signs in with its own passcode, and every change is checked on the server.",
  },
  {
    title: "Add medicines as a caretaker",
    role: "caretaker",
    doThis: [
      "Under Medicines, open “Add from a prescription photo” and upload a photo of a prescription or medicine strip. Gemini drafts each medicine; nothing is saved until you press “Confirm and add”.",
      "Or open “Add a medicine by hand”: name, dose, up to four daily times, start and end dates.",
      "Press “What is this for?” on any medicine for a three-sentence explanation written for an elderly reader.",
    ],
    why: "AI handles the messy input (photos, plain language); people stay in control of what is saved.",
  },
  {
    title: "Prepare for the doctor",
    role: "caretaker",
    doThis: [
      "In “Upcoming visits”, press “Prepare for the doctor”.",
      "A printable 30-day summary shows adherence per medicine, the hardest dose time (Metformin at 20:00), patterns and questions to ask.",
      "Press “Print or save as PDF” to see the clean printed version.",
    ],
    why: "Elders often cannot recall a month of doses in a short appointment; this gives the doctor facts, not guesses.",
  },
  {
    title: "Try it at a larger size, or on a phone",
    doThis: [
      "Use A+ or A++ at the top right: the whole app scales, and the choice is remembered.",
      "Open the site on a phone: every screen is designed for one hand and large text.",
    ],
    why: "The body font, Atkinson Hyperlegible, was designed by the Braille Institute for readers with low vision.",
  },
];
