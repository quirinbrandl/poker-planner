import {
  allocateLaterStack,
  type InitialDistributionRequest,
  measureMix,
  planInitialDistribution,
  reserveCapacity,
} from '@/domain/distribution';
import type { ChipMix } from '@/domain/types';

import { rng } from './oracle';

/**
 * Generated realistic chip sets, too large for the exhaustive oracle. Every answer is checked
 * against the definitions with independent arithmetic: exact values, inventory limits, the
 * small-blind rule, coverage (via `measureMix`), reserve (via `reserveCapacity`) and determinism.
 */

const SETS = [
  [1, 5, 25, 100, 500],
  [1, 2, 5, 10, 25, 100, 500, 1000],
  [25, 100, 500, 1000, 5000],
  [5, 25, 100, 500, 1000],
  [1, 5, 10, 25, 50, 100],
  [1, 2, 5, 10, 20, 50, 100, 200],
  [10, 20, 50, 100, 500, 1000, 5000, 10000],
  [1, 5, 25, 100],
];

const valueOf = (mix: ChipMix) => mix.reduce((sum, e) => sum + e.value * e.count, 0);
const chipsOf = (mix: ChipMix) => mix.reduce((sum, e) => sum + e.count, 0);

/** Largest positive amount ≤ limit representable by `denominations` (unlimited repetition). */
function largestRepresentable(denominations: number[], limit: number): number {
  const ok = new Uint8Array(limit + 1);
  ok[0] = 1;
  let best = 0;
  for (let a = 1; a <= limit; a++) {
    for (const d of denominations) if (d <= a && ok[a - d]) ok[a] = 1;
    if (ok[a]) best = a;
  }
  return best;
}

function generate(seed: number): InitialDistributionRequest {
  const random = rng(seed);
  const base = SETS[Math.floor(random() * SETS.length)];
  const values = base.filter(() => random() < 0.85);
  if (values.length === 0) values.push(base[0]);
  return {
    chipSet: values.map((value) => ({ value, count: Math.floor(random() * 300) + 20 })),
    players: 2 + Math.floor(random() * 11),
    requestedDepth: [20, 50, 100, 100, 150, 200][Math.floor(random() * 6)],
    coverage: [1, 2, 4, 4, 6][Math.floor(random() * 5)],
    reserveTarget: Math.floor(random() * 6),
    preference: random() < 0.5 ? 'fewer' : 'more',
  };
}

describe('generated realistic chip sets', () => {
  const cases = 60;
  it(`initial distributions are exact, within the chip set and deterministic (${cases} sets)`, () => {
    let planned = 0;
    let limited = 0;
    for (let seed = 1; seed <= cases; seed++) {
      const request = generate(7_000 + seed);
      const label = `seed ${7_000 + seed}`;
      const result = planInitialDistribution(request);
      expect({ label, again: planInitialDistribution(request) }).toEqual({ label, again: result });
      if (result.kind === 'searchLimitReached') {
        limited++;
        continue;
      }
      if (result.kind !== 'planned') continue;
      planned++;
      const d = result.distribution;
      const { players, chipSet } = request;
      // Exact value, blinds and identical mixes within the chip set.
      expect({ label, value: valueOf(d.stackMix), chips: chipsOf(d.stackMix) }).toEqual({ label, value: d.stackValue, chips: d.chipsPerStack });
      expect(d.stackValue).toBe(d.depth * d.blinds.big);
      const available = chipSet.filter((e) => e.count > 0).map((e) => e.value);
      expect({ label, small: d.blinds.small }).toEqual({ label, small: largestRepresentable(available, Math.floor(d.blinds.big / 2)) });
      expect(d.smallBlindIsHalf).toBe(d.blinds.small * 2 === d.blinds.big);
      d.bank.forEach((e, i) => {
        expect(e.value).toBe(chipSet[i].value);
        expect(e.count).toBe(chipSet[i].count - players * d.stackMix[i].count);
        expect(e.count).toBeGreaterThanOrEqual(0);
      });
      // Coverage of the starting stack and the claimed reserve, measured separately.
      expect({ label, m: measureMix({ mix: d.stackMix, blinds: d.blinds, stackValue: d.stackValue, coverage: request.coverage }) }).toMatchObject({
        label,
        m: { qualifies: true },
      });
      const capacity = reserveCapacity({ bank: d.bank, blinds: d.blinds, stackValue: d.stackValue, coverage: request.coverage, max: d.reserve });
      if (capacity.kind === 'measured') expect({ label, stacks: capacity.stacks }).toEqual({ label, stacks: d.reserve });
      expect(d.reserveReduced).toBe(d.reserve < request.reserveTarget);
      expect(d.depthAdjusted).toBe(d.depth !== request.requestedDepth);

      // A later stack from that bank stays within it, is exact and leaves what it claims.
      const keep = Math.min(2, d.reserve);
      const next = allocateLaterStack({
        bank: d.bank,
        blinds: d.blinds,
        stackValue: d.stackValue,
        coverage: request.coverage,
        preference: request.preference,
        reserveToKeep: keep,
        allowReducedCoverage: true,
      });
      if (d.reserve >= 1) expect({ label, kind: next.kind }).toEqual({ label, kind: 'qualifying' });
      if (next.kind === 'qualifying') {
        expect(valueOf(next.mix)).toBe(d.stackValue);
        const formable = reserveCapacity({ bank: d.bank, blinds: d.blinds, stackValue: d.stackValue, coverage: request.coverage, max: keep + 1 });
        if (formable.kind === 'measured') expect(next.reserveAfter).toBe(Math.min(keep, formable.stacks - 1));
        const rest = d.bank.map((e, i) => ({ value: e.value, count: e.count - next.mix[i].count }));
        rest.forEach((e) => expect(e.count).toBeGreaterThanOrEqual(0));
        expect(measureMix({ mix: next.mix, blinds: d.blinds, stackValue: d.stackValue, coverage: request.coverage })).toMatchObject({ qualifies: true });
        const after = reserveCapacity({ bank: rest, blinds: d.blinds, stackValue: d.stackValue, coverage: request.coverage, max: next.reserveAfter });
        if (after.kind === 'measured') expect(after.stacks).toBe(next.reserveAfter);
      }
    }
    expect(planned).toBeGreaterThan(cases / 2);
    expect(limited).toBeLessThanOrEqual(2);
  });
});
