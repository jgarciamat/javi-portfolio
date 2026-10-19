import { round2 } from '../round';
import type { GainSection, SaleResult } from '../rentaGains';
import type { LedgerResult } from './ledger';

/**
 * What to copy into the modelo 100 of 2025 (Orden HAC/277/2026, BOE-A-2026-7041, pages 14-15 and
 * 26), grouped as Renta WEB asks for it: funds and ETFs by fund (0310-0325), listed shares by issuer
 * (0326-0340), virtual currencies by coin and what was received (1800-1814), other elements one by
 * one (1624-1640, where the app puts derivatives and gold: NO CONFIRMADO), and the capital income.
 */

export interface DeclarationRow {
  section: GainSection;
  /** Name of the fund, issuer or coin (boxes 0311, 0327, 1802). */
  name: string;
  code: string;
  /** Crypto, box 1803: F legal tender, N another virtual currency (NO CONFIRMADO keys). */
  counterpart?: 'F' | 'N';
  /** Transmission value (0312, 0328, 1804, 1633). */
  proceeds: number;
  /** Acquisition value (0315, 0331, 1806, 1637). */
  cost: number;
  /** Gain (0316, 0332, 1809). */
  gain: number;
  /** Loss obtained (0321, 0337, 1807) and the part that counts this year (0322, 0338, 1808). */
  loss: number;
  lossCounted: number;
  sales: number;
}

/** The boxes of each column, by part of the modelo. */
export const SECTION_BOXES: Record<
  GainSection,
  { name: string; proceeds: string; cost: string; gain: string; loss: string; counted: string }
> = {
  iic: {
    name: '0311',
    proceeds: '0312',
    cost: '0315',
    gain: '0316',
    loss: '0321',
    counted: '0322',
  },
  shares: {
    name: '0327',
    proceeds: '0328',
    cost: '0331',
    gain: '0332',
    loss: '0337',
    counted: '0338',
  },
  crypto: {
    name: '1802',
    proceeds: '1804',
    cost: '1806',
    gain: '1809',
    loss: '1807',
    counted: '1808',
  },
  other: {
    name: '1626',
    proceeds: '1633',
    cost: '1637',
    gain: '1640',
    loss: '1638',
    counted: '1639',
  },
};

/** The sales of the year grouped as the modelo asks: one line per fund, issuer, or coin and key. */
export function declarationRows(ledger: LedgerResult): DeclarationRow[] {
  const rows = new Map<string, DeclarationRow>();
  const add = (s: SaleResult & { code: string }) => {
    const key = `${s.section}|${s.code}|${s.counterpart ?? ''}`;
    const row = rows.get(key) ?? {
      section: s.section,
      name: s.name,
      code: s.code,
      counterpart: s.counterpart,
      proceeds: 0,
      cost: 0,
      gain: 0,
      loss: 0,
      lossCounted: 0,
      sales: 0,
    };
    row.proceeds = round2(row.proceeds + s.proceeds);
    row.cost = round2(row.cost + s.cost);
    row.sales += 1;
    rows.set(key, row);
  };
  ledger.sales.forEach(add);
  for (const row of rows.values()) {
    const list = ledger.sales.filter(
      (s) => s.section === row.section && s.code === row.code && s.counterpart === row.counterpart
    );
    // Each sale is a gain or a loss of its own (the AEAT works them out sale by sale).
    row.gain = round2(list.reduce((sum, s) => sum + Math.max(0, s.gain), 0));
    row.loss = round2(list.reduce((sum, s) => sum + Math.max(0, -s.gain), 0));
    row.lossCounted = round2(list.reduce((sum, s) => sum + Math.max(0, -(s.gain + s.deferred)), 0));
  }
  // Derivatives and positions already closed by the platform: one line each, in "other elements".
  const direct = ledger.direct.map(
    (d): DeclarationRow => ({
      section: 'other',
      name: d.asset,
      code: d.date,
      proceeds: d.proceeds,
      cost: d.cost,
      gain: Math.max(0, d.gain),
      loss: Math.max(0, -d.gain),
      lossCounted: Math.max(0, -d.gain),
      sales: 1,
    })
  );
  const order: GainSection[] = ['iic', 'shares', 'crypto', 'other'];
  return [...rows.values(), ...direct].sort(
    (a, b) => order.indexOf(a.section) - order.indexOf(b.section) || a.name.localeCompare(b.name)
  );
}

/** Totals by part of the modelo and the capital income, to show at a glance. */
export function summaryOf(ledger: LedgerResult, rows = declarationRows(ledger)) {
  const by = (section: GainSection) => {
    const list = rows.filter((r) => r.section === section);
    const sum = (k: 'proceeds' | 'cost' | 'gain' | 'lossCounted') =>
      round2(list.reduce((s, r) => s + r[k], 0));
    return {
      proceeds: sum('proceeds'),
      cost: sum('cost'),
      gain: sum('gain'),
      loss: sum('lossCounted'),
    };
  };
  const c = ledger.imported.capital;
  return {
    iic: by('iic'),
    shares: by('shares'),
    crypto: by('crypto'),
    other: by('other'),
    capital: {
      '0027': c.interest,
      '0029': c.dividends,
      '0031': c.assets,
      '0037': c.expenses,
      '0597': ledger.imported.withheld.capital,
      '0603': ledger.imported.withheld.gains,
      foreignTax: round2(ledger.imported.foreignTax.reduce((s, f) => s + f.tax, 0)),
    },
    general: round2(ledger.imported.generalGains.reduce((s, g) => s + g, 0)),
  };
}

const date = (iso: string) => iso.split('-').reverse().join('/');

/** Every sale with the purchases it used (the FIFO audit), the income and the closed positions. */
export function reportTables(
  ledger: LedgerResult
): { name: string; rows: (string | number)[][] }[] {
  const sales = [
    [
      'Fecha de venta',
      'Activo',
      'Código',
      'Apartado',
      'Unidades',
      'Valor de transmisión (€)',
      'Valor de adquisición (€)',
      'Ganancia o pérdida (€)',
      'Pérdida que no cuenta este año (€)',
      'Compras usadas (FIFO)',
    ],
    ...ledger.history.map((s) => [
      date(s.date),
      s.name,
      s.code,
      s.section,
      s.units,
      s.proceeds,
      s.cost,
      s.gain,
      s.deferred,
      s.lots.map((l) => `${date(l.date)}: ${l.units} por ${round2(l.cost)} €`).join(' | '),
    ]),
  ];
  const income = [
    ['Fecha', 'Plataforma', 'Activo', 'Tipo', 'Importe (€)', 'Retención (€)', 'Dónde', 'Casilla'],
    ...ledger.income.map((i) => [
      date(i.date),
      i.account,
      i.asset,
      i.what,
      i.eur,
      i.withheld,
      i.withheldIn === 'spain' ? 'España' : 'Extranjero',
      i.box,
    ]),
  ];
  const direct = [
    [
      'Fecha de cierre',
      'Plataforma',
      'Activo',
      'Sobre',
      'Transmisión (€)',
      'Adquisición (€)',
      'Resultado (€)',
    ],
    ...ledger.direct.map((d) => [
      date(d.date),
      d.account,
      d.asset,
      d.underlying ?? '',
      d.proceeds,
      d.cost,
      d.gain,
    ]),
  ];
  const byAsset = [
    [
      'Apartado',
      'Fondo, empresa o moneda',
      'Código',
      'Clave 1803',
      'Ventas',
      'Valor de transmisión (€)',
      'Valor de adquisición (€)',
      'Ganancias (€)',
      'Pérdidas que cuentan (€)',
      'Casillas',
    ],
    ...declarationRows(ledger).map((r) => {
      const b = SECTION_BOXES[r.section];
      return [
        r.section,
        r.name,
        r.code,
        r.counterpart ?? '',
        r.sales,
        r.proceeds,
        r.cost,
        r.gain,
        r.lossCounted,
        `${b.proceeds} / ${b.cost} / ${b.gain} / ${b.counted}`,
      ];
    }),
  ];
  const years = [
    ['Año', 'Resultado base del ahorro (€)', 'Resultado base general (€)'],
    ...Object.entries(ledger.years).map(([y, v]) => [Number(y), v.savings, v.general]),
  ];
  return [
    { name: 'Por activo', rows: byAsset },
    { name: 'Ventas y FIFO', rows: sales },
    { name: 'Rendimientos', rows: income },
    { name: 'Posiciones cerradas', rows: direct },
    { name: 'Por año', rows: years },
  ];
}
