import {
  allocateLaterStack,
  type InitialDistributionRequest,
  measureMix,
  planInitialDistribution,
  reserveCapacity,
} from '@/domain/distribution';

/**
 * Generous wall-clock guards (several times the measured desktop times) so a slow CI machine
 * does not flake, while an accidental exponential blow-up still fails.
 */

const ADVERSARIAL_MS = 20_000;

const time = <T>(body: () => T): [T, number] => {
  const start = performance.now();
  const result = body();
  return [result, performance.now() - start];
};

const homeSet = [
  { value: 1, count: 100 },
  { value: 5, count: 100 },
  { value: 25, count: 100 },
  { value: 100, count: 50 },
  { value: 500, count: 25 },
];

const typical: [string, InitialDistributionRequest][] = [
  ['cash, 8 players, reserve 4, fewer', { chipSet: homeSet, players: 8, requestedDepth: 100, coverage: 4, reserveTarget: 4, preference: 'fewer' }],
  ['cash, 8 players, reserve 4, more', { chipSet: homeSet, players: 8, requestedDepth: 100, coverage: 4, reserveTarget: 4, preference: 'more' }],
  [
    'tournament, 20 players, 8 denominations',
    {
      chipSet: [1, 2, 5, 10, 25, 100, 500, 1000].map((value) => ({ value, count: 300 })),
      players: 20,
      requestedDepth: 200,
      coverage: 4,
      reserveTarget: 10,
      preference: 'more',
    },
  ],
  [
    'large denominations, 10 players',
    {
      chipSet: [25, 100, 500, 1000, 5000].map((value) => ({ value, count: 200 })),
      players: 10,
      requestedDepth: 300,
      coverage: 6,
      reserveTarget: 5,
      preference: 'fewer',
    },
  ],
];

describe('performance', () => {
  it.each(typical)('plans a typical game quickly: %s', (_, request) => {
    const [result, ms] = time(() => planInitialDistribution(request));
    expect(result.kind).toBe('planned');
    expect(ms).toBeLessThan(500);
  });

  it('allocates a later stack, measures a mix and counts the reserve in milliseconds', () => {
    const [plan] = time(() => planInitialDistribution(typical[0][1]));
    if (plan.kind !== 'planned') throw new Error('expected a plan');
    const d = plan.distribution;
    const [rebuy, rebuyMs] = time(() =>
      allocateLaterStack({ bank: d.bank, blinds: d.blinds, stackValue: d.stackValue, coverage: 4, preference: 'fewer', reserveToKeep: 3, allowReducedCoverage: true }),
    );
    expect(rebuy.kind).toBe('qualifying');
    const [measured, measureMs] = time(() => measureMix({ mix: d.stackMix, blinds: d.blinds, stackValue: d.stackValue, coverage: 4 }));
    expect(measured.kind).toBe('measured');
    const [capacity, capacityMs] = time(() => reserveCapacity({ bank: d.bank, blinds: d.blinds, stackValue: d.stackValue, coverage: 4, max: 10 }));
    expect(capacity.kind).toBe('measured');
    expect(rebuyMs).toBeLessThan(100);
    expect(measureMs).toBeLessThan(50);
    expect(capacityMs).toBeLessThan(100);
  });

  it('bounds adversarial inputs: an answer or searchLimitReached, never a hang', () => {
    // Odd denominations with hundreds of chips each make the exact packing questions hard; these
    // come from a generated sweep and exhaust the work limit in about 0.5 s in plain Node (also
    // for the Babel-compiled app code). Jest's module sandbox runs the same work several times
    // slower, hence the loose bound: it guards against unbounded work, not against slowness.
    const set = (pairs: [number, number][]) => pairs.map(([value, count]) => ({ value, count }));
    const plans: InitialDistributionRequest[] = [
      { chipSet: set([[7, 212], [23, 493], [97, 491], [101, 67], [997, 160]]), players: 19, requestedDepth: 20, coverage: 2, reserveTarget: 10, preference: 'more' },
    ];
    for (const request of plans) {
      const [result, ms] = time(() => planInitialDistribution(request));
      expect(['planned', 'noValidDistribution', 'searchLimitReached']).toContain(result.kind);
      expect(ms).toBeLessThan(ADVERSARIAL_MS);
    }
    const bank = set([[1, 120], [2, 428], [7, 128], [17, 248], [19, 218], [997, 270]]);
    const [later, laterMs] = time(() =>
      allocateLaterStack({ bank, blinds: { small: 3, big: 7 }, stackValue: 714, coverage: 5, preference: 'more', reserveToKeep: 0, allowReducedCoverage: true }),
    );
    expect(later.kind).toBeDefined();
    expect(laterMs).toBeLessThan(ADVERSARIAL_MS);
    const capacityBank = set([[1, 89], [2, 359], [7, 47], [11, 344], [17, 209], [31, 198], [101, 408]]);
    const [capacity, capacityMs] = time(() => reserveCapacity({ bank: capacityBank, blinds: { small: 3, big: 7 }, stackValue: 1127, coverage: 7, max: 10 }));
    expect(capacity.kind).toBeDefined();
    expect(capacityMs).toBeLessThan(ADVERSARIAL_MS);
  });
});
