import { parsePastedMovements } from '@modules/finances/domain/pastedMovements';

const TODAY = '2026-10-26';
const read = (text: string) => parsePastedMovements(text, TODAY);
const brief = (text: string) =>
  read(text).rows.map((r) => [r.date, r.description, r.amount, r.type]);

describe('parsePastedMovements', () => {
  it('reads one movement per line with Spanish dates and amounts', () => {
    expect(
      brief(
        [
          '12/10/2026 Mercadona -45,30 €',
          '11/10/2026  Nómina Octubre  +1.800,00 €',
          '10-10-26 Netflix −12,99€',
          '2026-10-09\tBizum a Laura\t-20,00\t1.234,56',
        ].join('\n')
      )
    ).toEqual([
      ['2026-10-12', 'Mercadona', -45.3, 'EXPENSE'],
      ['2026-10-11', 'Nómina Octubre', 1800, 'INCOME'],
      ['2026-10-10', 'Netflix', -12.99, 'EXPENSE'],
      ['2026-10-09', 'Bizum a Laura', -20, 'EXPENSE'],
    ]);
  });

  it('reads the blocks of the bank apps: a day, then each concept and its amount', () => {
    const text = `Movimientos
Hoy
Café Central
Pago con tarjeta
-1,50 €
Ayer
MERCADONA VALENCIA
-62,18 €
Saldo 1.230,00 €
Lunes, 12 de octubre
Transferencia recibida
1.500,00 €
Spotify
-10,99 €
3 oct.
Gasolinera Repsol **** 5402 14:32
-50,00 €`;
    expect(brief(text)).toEqual([
      ['2026-10-26', 'Café Central', -1.5, 'EXPENSE'],
      ['2026-10-25', 'MERCADONA VALENCIA', -62.18, 'EXPENSE'],
      ['2026-10-12', 'Transferencia recibida', 1500, 'INCOME'],
      ['2026-10-12', 'Spotify', -10.99, 'EXPENSE'],
      ['2026-10-03', 'Gasolinera Repsol', -50, 'EXPENSE'],
    ]);
  });

  it('reads English dates and amounts', () => {
    expect(
      brief('Oct 12, 2026 Coffee shop -€3.20\nOct 11 Salary +£2,100.00\nSep 30 Gym 35.00 EUR-')
    ).toEqual([
      ['2026-10-12', 'Coffee shop', -3.2, 'EXPENSE'],
      ['2026-10-11', 'Salary', 2100, 'INCOME'],
      ['2026-09-30', 'Gym', -35, 'EXPENSE'],
    ]);
  });

  it('puts a day without a year in the last year that is not in the future', () => {
    expect(brief('28 dic Regalos -30,00 €\n12/10 Bar -3,00 €')).toEqual([
      ['2025-12-28', 'Regalos', -30, 'EXPENSE'],
      ['2026-10-12', 'Bar', -3, 'EXPENSE'],
    ]);
  });

  it('without any sign, they are expenses unless the concept says otherwise, to review', () => {
    const parsed = read('12/10/2026 Mercadona 45,30\n11/10/2026 Nómina 1.800,00');
    expect(parsed.rows.map((r) => [r.amount, r.type])).toEqual([
      [-45.3, 'EXPENSE'],
      [1800, 'INCOME'],
    ]);
    expect(parsed.review).toEqual([0, 1]);
  });

  it('when only the charges carry a minus, the rest are incomes', () => {
    const parsed = read('12/10/2026 Mercadona -45,30\n11/10/2026 Pago de Ana 30,00');
    expect(parsed.rows.map((r) => r.amount)).toEqual([-45.3, 30]);
    expect(parsed.review).toEqual([]);
  });

  it('skips amounts it cannot place and ignores what is not a movement', () => {
    const parsed = read(
      'Fecha Concepto Importe\n-12,00 €\n\nSaldo disponible 900,00 €\n5402 2026\n12/10/2026 Cuota 0,00 €'
    );
    expect(parsed.rows).toEqual([]);
    expect(parsed.skipped).toEqual([2]);
  });

  it('does not take numbers without decimals nor a currency as amounts, nor bad days', () => {
    expect(brief('31/02/2026 Tienda 3 x 2 -9,99 €\n12/10/2026 Vuelo IB3456 -120 €')).toEqual([
      ['2026-10-12', 'Vuelo IB3456', -120, 'EXPENSE'],
    ]);
  });
});

describe('parsePastedMovements, blocks', () => {
  it('a day with its concept on the same line starts a new movement', () => {
    expect(brief('Compras\n12/10/2026 Mercadona\n-45,30 €\nLunes\n**** 5402\n-3,00 €')).toEqual([
      ['2026-10-12', 'Mercadona', -45.3, 'EXPENSE'],
    ]);
  });
});
