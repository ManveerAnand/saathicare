import { expect, it } from "vitest";
import { isAuthorizedCronRequest } from "./cron";

const secret = "sample-cron-token";
it.each([
  ["missing secret", `Bearer ${secret}`, undefined, false],
  ["missing header", null, secret, false],
  ["same-length wrong token", "Bearer sample-cron-tokeo", secret, false],
  ["different-length token", "Bearer wrong", secret, false],
  ["valid token", `Bearer ${secret}`, secret, true],
] as const)("checks a cron request with %s", (_scenario, header, conf, expected) => {
  expect(isAuthorizedCronRequest(header, conf)).toBe(expected);
});
