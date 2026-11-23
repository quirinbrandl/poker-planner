import { type Problem, problem } from '../core/problems';

/** Names compare case-insensitively, ignoring leading and trailing spaces. */
export function nameKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export type NameCheck = { ok: true; name: string } | { ok: false; problem: Problem };

/**
 * Validates a name for a saved player or template: required, unique among `existing`
 * (case-insensitive, trimmed). An accepted name is trimmed with its capitalization kept.
 */
export function checkName(raw: string, existing: readonly string[], what: string): NameCheck {
  const name = raw.trim();
  if (name === '') return { ok: false, problem: problem('nameRequired', 'name', `Enter a ${what} name.`) };
  const key = nameKey(name);
  const clash = existing.find((other) => nameKey(other) === key);
  if (clash !== undefined) {
    return { ok: false, problem: problem('duplicateName', 'name', `A ${what} named “${clash}” already exists.`) };
  }
  return { ok: true, name };
}

/** Case-insensitive alphabetical order for lists of named records. */
export function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.name.localeCompare(b.name);
}
