import { round2 } from '../round';
import type { Counterpart, GainSection } from '../rentaGains';
import type { LedgerResult } from './ledger';
import {
  APARTADO,
  rentaWebKit,
  fieldText,
  MONEY_FIELDS,
  webValue,
  type Alta,
  type RentaWebKit,
  type WebWindow,
} from './rentaWeb';

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

/**
 * What a column is for: a field to copy into Renta WEB, what Renta WEB must show afterwards (to
 * check, not to copy), the «Hecho» mark, or plain information.
 */
export type Zone = 'copy' | 'check' | 'done' | 'plain';

/** Where a section goes in the PDF: the first page, a window of Renta WEB, the totals or the annex. */
export type SheetKind = 'start' | 'window' | 'totals' | 'annex';

/**
 * One section of the PDF: a heading, some lines of text (and numbered steps on the first page),
 * then a table whose first row is the header. `zones` colours each column (copy / check / done);
 * `money` marks the columns of euros, written with two decimals.
 */
export interface ReportSheet {
  name: string;
  rows: SheetRow[];
  kind?: SheetKind;
  title?: string;
  intro?: string[];
  steps?: string[];
  /** The line right over the table. */
  caption?: string;
  zones?: Zone[];
  money?: boolean[];
  /** A window: its rows and the totals Renta WEB must show when it is done. */
  window?: PlanWindow;
}

export const TAB: Record<GainSection, string> = {
  iic: '1 Fondos (0310)',
  etf: '2 ETF (2225)',
  shares: '3 Acciones (0326)',
  crypto: '4 Monedas virtuales (1800)',
  other: '5 Otros elementos (1624)',
};

type Line = { alta: Alta; line: Alta };

/** A column of the tab that is not a field of the window. */
interface Extra {
  label: string;
  zone: Zone;
  money: boolean;
  of: (l: Line) => string | number;
}

const yesNo = (v: boolean) => (v ? 'Sí' : 'No');

/** What Renta WEB shows after «Aceptar», to check each row (not to copy). */
function checksOf(w: WebWindow): Extra[] {
  const b = SECTION_BOXES[w.section];
  const check = (label: string, of: Extra['of'], money = true): Extra => ({
    label,
    zone: 'check',
    money,
    of,
  });
  const gain = check(`Ganancia [${b.gain}]`, (l) => l.line.gain);
  const loss = check(`Pérdida [${b.loss}]`, (l) => l.line.loss);
  const counted = check(`Pérdida que cuenta [${b.counted}]`, (l) => l.line.counted);
  const count = (label: string) => check(label, (l) => l.line.sales, false);
  const fiscal = check(
    '¿Puede venir ya en tus datos fiscales?',
    (l) => yesNo(l.alta.fiscalData),
    false
  );
  switch (w.section) {
    case 'iic':
      return [
        check('Nombre del fondo (solo para ti)', (l) => l.alta.name, false),
        gain,
        loss,
        counted,
        count('Reembolsos incluidos'),
        fiscal,
      ];
    case 'shares':
      return [gain, loss, counted, count('Ventas incluidas'), fiscal];
    case 'crypto':
      return [
        check(`Valor de transmisión [${b.proceeds}]`, (l) => Number(l.line.values.proceeds)),
        check(`Valor de adquisición [${b.cost}]`, (l) => Number(l.line.values.cost)),
        loss,
        gain,
        count('Operaciones incluidas'),
      ];
    case 'other':
      return [loss, gain, count('Posiciones incluidas')];
    default:
      return [gain, loss, counted, count('Ventas incluidas')];
  }
}

/** The rows to copy of a window: one per alta (one per transaction for shares). */
const linesOf = (w: WebWindow): Line[] =>
  w.altas.flatMap((a) => (a.transactions ?? [a]).map((line) => ({ alta: a, line })));

/** The value of a field of the window for a row (a share's issuer is on the alta). */
const fieldValue = (l: Line, key: string) =>
  (l.line.values[key] ?? l.alta.values[key]) as string | number;

/** «Copia estas N filas en la ventana “X”», where it is and how to read the table. */
const windowTitle = (w: WebWindow) => {
  const rows = linesOf(w).length;
  return `${rows === 1 ? 'Copia esta fila' : `Copia estas ${rows} filas`} en la ventana “${
    w.def.title
  }”`;
};

const windowIntro = (w: WebWindow): string[] => [
  `Dónde: Renta WEB > abre tu declaración > «Apartados de la declaración» > ${APARTADO} > «${w.def.title}» > botón «Alta» (una vez por fila).`,
  'Columnas amarillas «Copiar»: cada una es un campo de la ventana, con el mismo nombre y en el mismo orden. Los importes llevan coma decimal y sin punto de miles, como los pide Renta WEB.',
  'Columnas grises «No copiar»: es lo que Renta WEB debe mostrarte al pulsar «Aceptar». Marca «Hecho» al terminar cada fila.',
];

/** The section of one window: its fields with the labels and order of Renta WEB, then what to check. */
function windowSheet(w: WebWindow, plan: PlanWindow): ReportSheet {
  const fields = w.def.fields;
  const extras: Extra[] = [
    ...checksOf(w),
    { label: 'Hecho', zone: 'done', money: false, of: () => '' },
  ];
  return {
    name: TAB[w.section],
    kind: 'window',
    title: windowTitle(w),
    intro: windowIntro(w),
    window: plan,
    zones: ['plain', ...fields.map((): Zone => 'copy'), ...extras.map((e) => e.zone)],
    money: [false, ...fields.map((f) => MONEY_FIELDS.has(f.key)), ...extras.map((e) => e.money)],
    rows: [
      ['Nº de alta', ...fields.map((f) => f.label), ...extras.map((e) => e.label)],
      ...linesOf(w).map((l) => [
        l.alta.n,
        ...fields.map((f) => fieldValue(l, f.key)),
        ...extras.map((e) => e.of(l)),
      ]),
    ],
  };
}

/** One window in a few numbers: how many rows to copy and the totals Renta WEB must show. */
export interface PlanWindow {
  section: GainSection;
  title: string;
  tab: string;
  rows: number;
  gains: { box: string; amount: number };
  losses: { box: string; amount: number };
}

/** What there is to copy, in a few numbers, and one row worked out field by field. */
export interface CopyPlan {
  windows: PlanWindow[];
  rows: number;
  /** About a minute and a half per row, plus five to open Renta WEB and check the totals. */
  minutes: number;
  example: {
    title: string;
    tab: string;
    alta: number;
    fields: { label: string; value: string }[];
  } | null;
}

export function copyPlan(kit: RentaWebKit): CopyPlan {
  const windows = kit.windows.map((w) => ({
    section: w.section,
    title: w.def.title,
    tab: TAB[w.section],
    rows: linesOf(w).length,
    gains: { box: w.def.totals.gains, amount: w.totals.gains },
    losses: { box: w.def.totals.losses, amount: w.totals.losses },
  }));
  const rows = windows.reduce((s, w) => s + w.rows, 0);
  const first = kit.windows[0];
  const line = first && linesOf(first)[0];
  return {
    windows,
    rows,
    minutes: rows === 0 ? 0 : Math.ceil(rows * 1.5) + 5,
    example: line
      ? {
          title: first.def.title,
          tab: TAB[first.section],
          alta: line.alta.n,
          fields: first.def.fields.map((f) => ({
            label: f.label,
            value: fieldText(f.key, fieldValue(line, f.key)) || '(vacío)',
          })),
        }
      : null,
  };
}

/** «Empieza aquí»: how many rows, where, what totals, the three steps and one row worked out. */
function startSheet(year: number, kit: RentaWebKit, plan: CopyPlan): ReportSheet {
  const start = {
    name: '0 Empieza aquí',
    kind: 'start' as const,
    title: `Empieza aquí: qué copiar en Renta WEB (Renta ${year})`,
  };
  const lead =
    'Finanverso prepara los datos; no presenta nada: tú los copias en Renta WEB, una fila cada vez.';
  if (plan.windows.length === 0)
    return {
      ...start,
      intro: [lead, 'No hay ventas que copiar: solo importes que van en sus casillas.'],
      caption: 'Escribe estos importes en Renta WEB, cada uno en su casilla:',
      zones: ['plain', 'plain', 'copy'],
      money: [false, false, true],
      rows: [
        ['Casilla', 'Concepto', 'Importe (€)'],
        ...kit.totals.map((t) => [t.box, t.label, t.amount]),
      ],
    };
  const example = plan.example as NonNullable<CopyPlan['example']>;
  return {
    ...start,
    intro: [lead],
    steps: [
      `Abre Renta WEB con tu Cl@ve, certificado o referencia y entra en tu declaración. En «Apartados de la declaración», ve a ${APARTADO} y abre la ventana de cada sección de este PDF.`,
      'Pulsa «Alta» y copia una fila: cada columna amarilla «Copiar» es un campo de la ventana, con su mismo nombre y en su orden. Pulsa «Aceptar» y marca «Hecho». Repite con cada fila.',
      'Al terminar, comprueba que Renta WEB muestra los totales de cada casilla: los tienes en esta página, al final de cada sección y en la página «Totales que debes ver en Renta WEB».',
    ],
    caption: `Ejemplo resuelto: la fila ${example.alta} de la sección «${example.tab}» se escribe así en la ventana «${example.title}»:`,
    zones: ['plain', 'copy'],
    rows: [
      ['Campo de la ventana en Renta WEB', 'Qué escribes'],
      ...example.fields.map((f) => [f.label, f.value]),
    ],
  };
}

/**
 * The sections of `Finanverso-Renta-<año>-copiar-en-Renta-WEB.pdf`: «Empieza aquí», one per window
 * of Renta WEB (one row per alta, with the window's labels in its order and what Renta WEB will
 * show), the totals by box and, as the annex, every sale with its FIFO purchases and its alta (the
 * proof to keep), the income and the years.
 */
export function reportTables(
  ledger: LedgerResult,
  kit: RentaWebKit = rentaWebKit(ledger)
): ReportSheet[] {
  const totals: ReportSheet = {
    name: '6 Totales por casilla',
    kind: 'totals',
    title: 'Totales que debes ver en Renta WEB',
    intro: ['Lo que Renta WEB debe mostrar al terminar (no se copia: es para comprobar).'],
    zones: ['plain', 'plain', 'check'],
    money: [false, false, true],
    rows: [
      ['Casilla', 'Concepto', 'Importe (€)'],
      ...kit.totals.map((t) => [t.box, t.label, t.amount]),
    ],
  };
  const sales: ReportSheet = {
    name: '7 Detalle por operación',
    kind: 'annex',
    title: 'Anexo: detalle por operación (FIFO)',
    intro: [
      'El justificante de cada venta, con las compras que se usaron (las primeras que entraron son las primeras que salen). No se copia en Renta WEB: guárdalo.',
    ],
    money: [false, false, false, false, false, false, true, true, true, true, false],
    rows: [
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
        s.lots
          .map(
            (l) =>
              `${date(l.date)}: ${String(l.units).replace('.', ',')} por ${webValue(
                round2(l.cost)
              )} €`
          )
          .join(' | '),
      ]),
      ...ledger.direct.map((d, i) => [
        date(d.date),
        d.asset,
        '',
        TAB.other,
        kit.altaOfDirect[i],
        '',
        d.proceeds,
        d.cost,
        d.gain,
        0,
        `Abierta el ${date(d.acquired)}`,
      ]),
    ],
  };
  const income: ReportSheet = {
    name: '8 Rendimientos',
    kind: 'annex',
    title: 'Anexo: rendimientos del capital',
    money: [false, false, false, false, true, true, false, false],
    rows: [
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
    ],
  };
  const years: ReportSheet = {
    name: '9 Por año',
    kind: 'annex',
    title: 'Anexo: resultado por año',
    money: [false, true, true],
    rows: [
      ['Año', 'Resultado base del ahorro (€)', 'Resultado base general (€)'],
      ...Object.entries(ledger.years).map(([y, v]) => [Number(y), v.savings, v.general]),
    ],
  };
  const plan = copyPlan(kit);
  return [
    startSheet(ledger.year, kit, plan),
    ...kit.windows.map((w, i) => windowSheet(w, plan.windows[i])),
    totals,
    sales,
    income,
    years,
  ].filter((sheet) => sheet.rows.length > 1);
}

/** The name of the PDF to download. */
export const copyFileName = (year: number) => `Finanverso-Renta-${year}-copiar-en-Renta-WEB.pdf`;
