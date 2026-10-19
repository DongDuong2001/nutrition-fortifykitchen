/** A name for a storage failure the person can be told about: the disk is full, or storage is blocked or denied. */
export function storageErrorKind(error: unknown): "quota" | "blocked" | "other" {
  const name = (error as { name?: string } | null)?.name ?? "";
  const message = String((error as { message?: string } | null)?.message ?? "");
  if (name === "QuotaExceededError" || /quota/i.test(message)) return "quota";
  if (name === "SecurityError" || name === "InvalidStateError" || name === "NotAllowedError" || /unavailable|denied|blocked/i.test(message)) return "blocked";
  return "other";
}
