import { retaFor } from '@domain/services/autonomo';

describe('retaFor (Orden PJC/297/2026, tablas de 2026)', () => {
  it('puts each limit in the bracket the order says', () => {
    expect(retaFor(0).bracket).toBe('R1');
    expect(retaFor(670).bracket).toBe('R1');
    expect(retaFor(670.01).bracket).toBe('R2');
    expect(retaFor(900).bracket).toBe('R2');
    // Tabla reducida, tramo 3: «> 900 y < 1.166,70»; tabla general, tramo 1: «≥ 1.166,70».
    expect(retaFor(1166.69).bracket).toBe('R3');
    expect(retaFor(1166.7).bracket).toBe('G1');
    expect(retaFor(1300).bracket).toBe('G1');
    expect(retaFor(6000).bracket).toBe('G11');
    expect(retaFor(6000.01).bracket).toBe('G12');
  });

  it('works out the fees at 31.5 % of the minimum and maximum bases', () => {
    // G5: 1.209,15 × 0,315 = 380,88; 2.030 × 0,315 = 639,45.
    expect(retaFor(1860)).toMatchObject({ bracket: 'G5', feeMin: 380.88, feeMax: 639.45 });
  });
});

describe('retaFor by year (Orden PJC/51/2024 and PJC/178/2025, art. 15)', () => {
  it('2024: G5 from 1,062.09 € at 31.3 %, G12 up to 4,720.50 €', () => {
    // 1.062,09 × 0,313 = 332,43; 2.030 × 0,313 = 635,39.
    expect(retaFor(1860, 2024)).toMatchObject({
      bracket: 'G5',
      baseMin: 1062.09,
      feeMin: 332.43,
      feeMax: 635.39,
      rate: 0.313,
      year: 2024,
      known: true,
    });
    expect(retaFor(7000, 2024)).toMatchObject({
      bracket: 'G12',
      baseMin: 1732.03,
      baseMax: 4720.5,
    });
    // Tabla reducida, tramo 1: 735,29 × 0,313 = 230,15.
    expect(retaFor(500, 2024)).toMatchObject({ bracket: 'R1', feeMin: 230.15 });
  });

  it('2025: the same bases as 2026 at 31.4 %, G11 and G12 up to 4,909.50 €', () => {
    // 1.209,15 × 0,314 = 379,67; 2.030 × 0,314 = 637,42.
    expect(retaFor(1860, 2025)).toMatchObject({ feeMin: 379.67, feeMax: 637.42, known: true });
    expect(retaFor(5000, 2025)).toMatchObject({ bracket: 'G11', baseMax: 4909.5 });
    expect(retaFor(5000, 2026)).toMatchObject({ bracket: 'G11', baseMax: 5101.2 });
  });

  it('a year with no order yet takes the latest one and says so; before 2024, the first one', () => {
    expect(retaFor(1860, 2027)).toMatchObject({ rate: 0.315, year: 2027, known: false });
    expect(retaFor(1860, 2023)).toMatchObject({ rate: 0.313, year: 2023, known: false });
  });
});
