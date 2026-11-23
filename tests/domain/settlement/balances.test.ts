import { playerBalances, settlePayments } from '@/domain/settlement';

describe('player balances', () => {
  it('Alice and Bob each contribute EUR 20 and finish with EUR 30 and EUR 10: Bob pays Alice EUR 10', () => {
    const balances = playerBalances([
      { id: 'alice', finalResult: 3000, contributions: 2000 },
      { id: 'bob', finalResult: 1000, contributions: 2000 },
    ]);
    expect(balances).toEqual([
      { id: 'alice', balance: 1000 },
      { id: 'bob', balance: -1000 },
    ]);
    expect(settlePayments(balances)).toEqual([{ fromId: 'bob', toId: 'alice', amount: 1000 }]);
  });

  it('counts rebuys as contributions', () => {
    expect(
      playerBalances([
        { id: 'a', finalResult: 0, contributions: 4000 },
        { id: 'b', finalResult: 6000, contributions: 2000 },
      ]),
    ).toEqual([
      { id: 'a', balance: -4000 },
      { id: 'b', balance: 4000 },
    ]);
  });

  it('throws when results and contributions do not sum to zero', () => {
    expect(() => playerBalances([{ id: 'a', finalResult: 2001, contributions: 2000 }])).toThrow(/zero/);
  });
});
