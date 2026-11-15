import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const KEY_LENGTH = 32;

/** Hashes a passcode as "salt:hash" (hex), using scrypt with a random 16-byte salt. */
export async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(passcode, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/** Constant-time check of a passcode against a stored "salt:hash". */
export async function verifyPasscode(passcode: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(passcode, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
