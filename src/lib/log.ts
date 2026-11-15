/** Logs an error category since third-party error messages can contain private data. */
export function logError(scope: string, err: unknown): void {
  const message = err instanceof Error ? "Error" : typeof err === "string" ? "Error message withheld" : "Unknown error";
  console.error(`[${scope}] ${message}`);
}

/** Logs an informational message supplied by the caller. */
export function logInfo(scope: string, message: string): void {
  console.info(`[${scope}] ${message}`);
}
