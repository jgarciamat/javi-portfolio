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
