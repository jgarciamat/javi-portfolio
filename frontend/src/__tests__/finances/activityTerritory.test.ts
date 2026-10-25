import {
  hardToJustifyRate,
  instalmentRates,
  reducedInstalment,
} from '@modules/finances/domain/activityTerritory';

describe('the reduced instalment by territory (art. 110.2 RIRPF; DA 57.ª LIRPF)', () => {
  it('applies in Ceuta and Melilla always and in La Palma only in its quarters', () => {
    expect(reducedInstalment('ceuta', 2027, 1)).toBe(true);
    expect(reducedInstalment('laPalma', 2024, 1)).toBe(false);
    expect(reducedInstalment('laPalma', 2024, 2)).toBe(true);
    // No extension published for 2027.
    expect(reducedInstalment('laPalma', 2027, 4)).toBe(false);
    expect(reducedInstalment(undefined, 2026, 4)).toBe(false);
    expect(instalmentRates('melilla', 2026, 1)).toEqual({ direct: 0.08, agrarian: 0.008 });
    expect(instalmentRates('general', 2026, 1)).toEqual({ direct: 0.2, agrarian: 0.02 });
  });
});

describe('the hard-to-justify rate by year (art. 30.2.ª RIRPF; DA 56.ª and DA 64.ª LIRPF)', () => {
  it('is 7 % in 2023 only and 5 % in 2022, 2024, 2025 and 2026, as on the server', () => {
    expect([2022, 2023, 2024, 2025, 2026].map((y) => hardToJustifyRate('general', y, 1))).toEqual([
      0.05, 0.07, 0.05, 0.05, 0.05,
    ]);
    expect([hardToJustifyRate(undefined, 2023, 4), hardToJustifyRate('ceuta', 2026, 4)]).toEqual([
      0.07, 0.1,
    ]);
  });
});
