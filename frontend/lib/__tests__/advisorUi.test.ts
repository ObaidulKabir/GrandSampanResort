import { badgesFor, monthlyOutlay } from '../advisorUi';

describe('Help me choose result labels', () => {
  it('marks the first card Best fit and others by monthly vs total', () => {
    const list = [
      { netPrice: 980000, depositAmount: 294000, installmentMonths: 24, cadence: 'monthly' },
      { netPrice: 929000, depositAmount: 929000, installmentMonths: 24, cadence: 'monthly' },
      { netPrice: 1000000, depositAmount: 100000, installmentMonths: 36, cadence: 'monthly' }
    ];
    expect(monthlyOutlay(list[1])).toBe(0);
    expect(badgesFor(list)).toEqual(['Best fit', 'Pay less overall', 'Smaller monthly']);
  });
});
