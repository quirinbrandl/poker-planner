/**
 * A participant as settlement sees it: an opaque, stable id. Every settlement function takes
 * participants as an array **in fixed joining order** (index 0 joined first); that position is the
 * only tie-breaker. Names and screen sorting never enter a calculation.
 */
export type ParticipantId = string;

/** Throws when two entries share an id: a programming error in the caller. */
export function assertUniqueIds(entries: readonly { id: ParticipantId }[]): void {
  const seen = new Set<ParticipantId>();
  for (const { id } of entries) {
    if (seen.has(id)) throw new Error(`Settlement: duplicate participant id ${JSON.stringify(id)}.`);
    seen.add(id);
  }
}

/** Throws unless `value` is a safe integer. */
export function assertWhole(value: number, what: string): void {
  if (!Number.isSafeInteger(value)) throw new Error(`Settlement: ${what} must be a whole number, got ${value}.`);
}
