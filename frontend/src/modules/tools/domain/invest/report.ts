import { round2 } from '../round';
import type { Counterpart, GainSection } from '../rentaGains';
import type { LedgerResult } from './ledger';
import { APARTADO, rentaWebKit, type RentaWebKit } from './rentaWeb';

/**
 * What to copy into the modelo 100 of 2025 (Orden HAC/277/2026, BOE-A-2026-7041), as Renta WEB
 * asks for it (rentaWeb.ts): funds by fund (0310-0325), ETFs and index SICAV by ISIN (2225-2236,
 * new in 2025), listed shares by issuer (0326-0340), virtual currencies by coin, key and sign
 * (1800-1814), other elements (1624-1654: derivatives and gold), and the capital income.
 */

export interface DeclarationRow {
  section: GainSection;
  /** Name of the fund, issuer or coin (boxes 0311, 2226, 0327, 1802). */
  name: string;
  /** Crypto, box 1803. */
  counterpart?: Counterpart;
  /** Transmission value (0312, 2227, 0328, 1804, 1633). */
  proceeds: number;
  /** Acquisition value (0315, 2229, 0331, 1806, 1637). */
  cost: number;
  /** Gain (0316, 2230, 0332, 1809). */
  gain: number;
  /** Loss obtained (0321, 2233, 0337, 1807) and the part that counts this year (0322, 2234, 0338). */
  loss: number;
  lossCounted: number;
  sales: number;
  /** The mark of a loss that does not count because of a repurchase. */
  blocked: boolean;
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
  etf: {
    name: '2226',
    proceeds: '2227',
    cost: '2229',
    gain: '2230',
    loss: '2233',
    counted: '2234',
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

/** One line per alta of Renta WEB (per transaction for shares), in the order of the windows. */
export function declarationRows(
  ledger: LedgerResult,
  kit: RentaWebKit = rentaWebKit(ledger)
): DeclarationRow[] {
  return kit.windows.flatMap((w) =>
    w.altas.flatMap((a) =>
      (a.transactions ?? [a]).map((line) => ({
        section: w.section,
        name: a.name,
        counterpart: w.section === 'crypto' ? (String(a.values.key)[0] as Counterpart) : undefined,
        proceeds: Number(line.values.proceeds),
        cost: Number(line.values.cost),
        gain: line.gain,
        loss: line.loss,
        lossCounted: line.counted,
        sales: line.sales,
        blocked: line.blocked,
      }))
    )
  );
}

/**
 * Totals by part of the modelo worked out sale by sale (the reference the altas must give) and the
 * capital income.
 */
export function summaryOf(ledger: LedgerResult) {
  const by = (section: GainSection) => {
    const sales = ledger.sales.filter((s) => s.section === section);
    const direct = section === 'other' ? ledger.direct : [];
    const lines = [
      ...sales.map((s) => ({
        p: s.proceeds,
        c: s.cost,
        gain: s.gain,
        counted: s.gain + s.deferred,
      })),
      ...direct.map((d) => ({ p: d.proceeds, c: d.cost, gain: d.gain, counted: d.gain })),
    ];
    const total = (f: (l: (typeof lines)[number]) => number) =>
      round2(lines.reduce((t, l) => t + f(l), 0));
    return {
      proceeds: total((l) => l.p),
      cost: total((l) => l.c),
      gain: total((l) => Math.max(0, l.gain)),
      loss: total((l) => Math.max(0, -l.counted)),
    };
  };
  const c = ledger.imported.capital;
  return {
    iic: by('iic'),
    etf: by('etf'),
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

type SheetRow = (string | number)[];

/** The tab of one window: its fields with the labels and order of Renta WEB, then what to check. */
function windowSheet(w: RentaWebKit['windows'][number]): SheetRow[] {
  const b = SECTION_BOXES[w.section];
  const fields = w.def.fields;
  const lines = w.altas.flatMap((a) => (a.transactions ?? [a]).map((line) => ({ alta: a, line })));
  const check: Record<typeof w.section, string[]> = {
    iic: [
      'Nombre del fondo (solo para ti)',
      `Ganancia [${b.gain}]`,
      `Pérdida [${b.loss}]`,
      `Pérdida que cuenta [${b.counted}]`,
      'Reembolsos incluidos',
      '¿Puede venir ya en tus datos fiscales?',
      'Hecho',
    ],
    etf: [
      `Ganancia [${b.gain}]`,
      `Pérdida [${b.loss}]`,
      `Pérdida que cuenta [${b.counted}]`,
      'Ventas incluidas',
      'Hecho',
    ],
    shares: [
      `Ganancia [${b.gain}]`,
      `Pérdida [${b.loss}]`,
      `Pérdida que cuenta [${b.counted}]`,
      'Ventas incluidas',
      '¿Puede venir ya en tus datos fiscales?',
      'Hecho',
    ],
    crypto: [
      `Valor de transmisión [${b.proceeds}]`,
      `Valor de adquisición [${b.cost}]`,
      `Pérdida [${b.loss}]`,
      `Ganancia [${b.gain}]`,
      'Operaciones incluidas',
      'Hecho',
    ],
    other: [`Pérdida [${b.loss}]`, `Ganancia [${b.gain}]`, 'Posiciones incluidas', 'Hecho'],
  };
  const yesNo = (v: boolean) => (v ? 'Sí' : 'No');
  const checks = ({ alta, line }: (typeof lines)[number]): SheetRow => {
    const values = line.values;
    switch (w.section) {
      case 'iic':
        return [
          alta.name,
          line.gain,
          line.loss,
          line.counted,
          line.sales,
          yesNo(alta.fiscalData),
          '',
        ];
      case 'shares':
        return [line.gain, line.loss, line.counted, line.sales, yesNo(alta.fiscalData), ''];
      case 'crypto':
        return [Number(values.proceeds), Number(values.cost), line.loss, line.gain, line.sales, ''];
      case 'other':
        return [line.loss, line.gain, line.sales, ''];
      default:
        return [line.gain, line.loss, line.counted, line.sales, ''];
    }
  };
  return [
    ['Nº de alta', ...fields.map((f) => f.label), ...check[w.section]],
    ...lines.map((l) => [
      l.alta.n,
      // Every field of the window has its value (a share's issuer is on the alta).
      ...fields.map((f) => (l.line.values[f.key] ?? l.alta.values[f.key]) as string | number),
      ...checks(l),
    ]),
  ];
}

const TAB: Record<GainSection, string> = {
  iic: '1 Fondos (0310)',
  etf: '2 ETF (2225)',
  shares: '3 Acciones (0326)',
  crypto: '4 Monedas virtuales (1800)',
  other: '5 Otros elementos (1624)',
};

/**
 * `Finanverso-Renta-<año>-copiar-en-Renta-WEB`: a tab per window of Renta WEB (one row per alta,
 * with the window's labels in its order and what Renta WEB will show), the totals by box, every
 * sale with its FIFO purchases and its alta (the proof to keep), the income and the years.
 */
export function reportTables(
  ledger: LedgerResult,
  kit: RentaWebKit = rentaWebKit(ledger)
): { name: string; rows: SheetRow[] }[] {
  const how: SheetRow[] = [
    ['Cómo usar este archivo'],
    [
      `Renta ${ledger.year}. Finanverso prepara los datos; no presenta nada: tú los copias en Renta WEB.`,
    ],
    ['1. Entra en Renta WEB con tu Cl@ve, certificado o referencia y abre tu declaración.'],
    [`2. Ve al apartado ${APARTADO}.`],
    [
      '3. En cada ventana de este archivo (una pestaña cada una) pulsa «Alta» y copia una fila: cada columna es un campo de la ventana, en el mismo orden.',
    ],
    [
      '4. Pulsa «Aceptar» y comprueba que Renta WEB muestra lo de las columnas de comprobación; marca «Hecho».',
    ],
    ['5. Al final, compara los totales de Renta WEB con la pestaña «6 Totales por casilla».'],
    [
      'Guarda este archivo y la pestaña «7 Detalle por operación» al menos 4 años (art. 66 de la Ley General Tributaria).',
    ],
  ];
  const totals: SheetRow[] = [
    ['Casilla', 'Concepto', 'Importe (€)'],
    ...kit.totals.map((t) => [t.box, t.label, t.amount]),
  ];
  const sales: SheetRow[] = [
    [
      'Fecha de venta',
      'Activo',
      'Código',
      'Apartado',
      'Nº de alta',
      'Unidades',
      'Valor de transmisión (€)',
      'Valor de adquisición (€)',
      'Ganancia o pérdida (€)',
      'Pérdida que no cuenta este año (€)',
      'Compras usadas (FIFO)',
    ],
    ...ledger.sales.map((s) => [
      date(s.date),
      s.name,
      s.code,
      TAB[s.section],
      kit.altaOfSale.get(s) as number,
      s.units,
      s.proceeds,
      s.cost,
      s.gain,
      s.deferred,
      s.lots.map((l) => `${date(l.date)}: ${l.units} por ${round2(l.cost)} €`).join(' | '),
    ]),
    ...ledger.direct.map((d) => [
      date(d.date),
      d.asset,
      '',
      TAB.other,
      '',
      '',
      d.proceeds,
      d.cost,
      d.gain,
      0,
      `Abierta el ${date(d.acquired)}`,
    ]),
  ];
  const income: SheetRow[] = [
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
  const years: SheetRow[] = [
    ['Año', 'Resultado base del ahorro (€)', 'Resultado base general (€)'],
    ...Object.entries(ledger.years).map(([y, v]) => [Number(y), v.savings, v.general]),
  ];
  return [
    { name: '0 Cómo usar', rows: how },
    ...kit.windows.map((w) => ({ name: TAB[w.section], rows: windowSheet(w) })),
    { name: '6 Totales por casilla', rows: totals },
    { name: '7 Detalle por operación', rows: sales },
    { name: '8 Rendimientos', rows: income },
    { name: '9 Por año', rows: years },
  ].filter((sheet) => sheet.rows.length > 1);
}

/** The name of the files to download. */
export const copyFileName = (year: number, ext: 'xlsx' | 'pdf') =>
  `Finanverso-Renta-${year}-copiar-en-Renta-WEB.${ext}`;
