import { expect, it } from "vitest";
import { detectImageType } from "./image";

it.each([
  ["image/jpeg", [0xff, 0xd8, 0xff, 0xe0]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ["image/webp", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]],
] as const)("recognizes %s by signature", (mime, bytes) => {
  expect(detectImageType(Uint8Array.from(bytes))).toBe(mime);
});

it.each([
  ["an empty file", []],
  ["a truncated PNG", [0x89, 0x50, 0x4e, 0x47]],
  ["a RIFF file without a WebP signature", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]],
  ["a file containing HTML", [0x3c, 0x68, 0x74, 0x6d, 0x6c]],
] as const)("rejects %s", (_name, bytes) => {
  expect(detectImageType(Uint8Array.from(bytes))).toBeNull();
});
