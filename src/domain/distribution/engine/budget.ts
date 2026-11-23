/**
 * Deterministic work limit for one public call. Every search node spends one step; when the
 * steps run out the search unwinds with `SEARCH_LIMIT` and the public function reports
 * `searchLimitReached`. Counting steps instead of time keeps outcomes identical across devices.
 */
export const SEARCH_LIMIT: unique symbol = Symbol('searchLimit');

class LocalLimit {
  constructor(readonly level: number) {}
}

export class Budget {
  private left: number;
  private readonly locals: number[] = [];

  constructor(steps: number) {
    this.left = steps;
  }

  spend(steps = 1): void {
    this.left -= steps;
    if (this.left < 0) throw SEARCH_LIMIT;
    for (let level = 0; level < this.locals.length; level++) {
      this.locals[level] -= steps;
      if (this.locals[level] < 0) throw new LocalLimit(level);
    }
  }

  /**
   * Runs `body` with an additional allowance of `steps` (still charged to the whole budget).
   * Returns undefined if the allowance runs out first. Callers must only memoize results of
   * work that finished, so an abandoned attempt leaves no wrong state behind.
   */
  within<T>(steps: number, body: () => T): T | undefined {
    const level = this.locals.length;
    this.locals.push(steps);
    try {
      return body();
    } catch (error) {
      if (error instanceof LocalLimit && error.level === level) return undefined;
      throw error;
    } finally {
      this.locals.length = level;
    }
  }
}

/** Runs `body` with a fresh budget and maps exhaustion to `searchLimitReached`. */
export function withBudget<T>(steps: number, body: (budget: Budget) => T): T | { kind: 'searchLimitReached' } {
  try {
    return body(new Budget(steps));
  } catch (error) {
    if (error === SEARCH_LIMIT) return { kind: 'searchLimitReached' };
    throw error;
  }
}
