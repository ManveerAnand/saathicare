import { timingSafeEqual } from "node:crypto";

/** Checks the bearer header without comparing secret bytes in ordinary string code. */
export function isAuthorizedCronRequest(header: string | null, secret: string | undefined): boolean {
  if (!header || !secret) return false;
  const actual = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
