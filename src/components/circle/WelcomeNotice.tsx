/** Shown once, right after a new care circle is created. */
export function WelcomeNotice({ careCode }: { careCode: string }) {
  return (
    <p className="notice ok" role="status">
      Your care circle is ready. Share the care code <strong>{careCode}</strong> and each person&apos;s passcode.
    </p>
  );
}
