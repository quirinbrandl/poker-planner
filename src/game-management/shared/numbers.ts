export type WholeNumberParse = { ok: true; value: number } | { ok: false; error: 'empty' | 'notWholeNumber' | 'tooLarge' };

/**
 * Parses a whole-number field (depth, coverage, reserve, chip values and quantities): ungrouped
 * digits only, outer whitespace ignored. Signs, decimals, grouping and exponents are rejected, never
 * rounded. Range checks (minimums) belong to the caller.
 */
export function parseWholeNumber(raw: string): WholeNumberParse {
  const text = raw.trim();
  if (text === '') return { ok: false, error: 'empty' };
  if (!/^\d+$/.test(text)) return { ok: false, error: 'notWholeNumber' };
  const value = Number(text);
  if (!Number.isSafeInteger(value)) return { ok: false, error: 'tooLarge' };
  return { ok: true, value };
}

/** "1,000" — thousands grouping for counts shown in summaries. */
export function formatCount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
