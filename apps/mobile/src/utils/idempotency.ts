// Not cryptographically significant — only needs to be unique per attempt so
// a retried request can be recognized as a replay by the backend ledger.
export function generateIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
