import { expect, it } from "vitest";
import { loginSchema } from "@/lib/validation";
import { formError } from "./formError";

it("links a validation error to its field and restores only the allowlisted data", () => {
  const form = new FormData();
  form.set("profileId", "bad-code");
  form.set("passcode", "123456");
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  expect(parsed.success).toBe(false);
  if (parsed.success) return;
  expect(formError({}, parsed.error, form, ["profileId"])).toMatchObject({
    errorCount: 1,
    field: "profileId",
    values: { profileId: "bad-code" },
  });
  expect(formError({}, parsed.error, form, ["profileId"]).values).not.toHaveProperty("passcode");
});

it("advances the error count on an identical failure so default values are reapplied", () => {
  const form = new FormData();
  const first = formError({}, "Wrong passcode", form, [], { field: "passcode" });
  const second = formError(first, "Wrong passcode", form, [], { field: "passcode" });
  expect(second).toEqual({ error: "Wrong passcode", errorCount: 2, field: "passcode", values: {} });
});
