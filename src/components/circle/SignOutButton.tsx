import { signOut } from "@/app/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOut} className="sign-out">
      <button type="submit" className="secondary">
        Sign out
      </button>
    </form>
  );
}
