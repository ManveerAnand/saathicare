import { signOut } from "@/app/actions/auth";

/** Submits the action that ends the current session. */
export function SignOutButton() {
  return (
    <form action={signOut} className="sign-out">
      <button type="submit" className="secondary">
        Sign out
      </button>
    </form>
  );
}
