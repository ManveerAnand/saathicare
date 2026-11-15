import { randomInt } from "node:crypto";

// No 0/o, 1/l/i: the care code is read aloud and typed by elders.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** A random id from an unambiguous alphabet, using a cryptographic RNG. */
export function newId(length = 10): string {
  let id = "";
  for (let i = 0; i < length; i++) id += ALPHABET[randomInt(ALPHABET.length)];
  return id;
}
