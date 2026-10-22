import type {
  ActivitiesResult,
  ActivityInput,
  DirectResult,
  FarmResult,
  ModulesResult,
} from './rentaActivity';
import { round2 } from './round';

/**
 * The boxes of the modelo 100 of 2025 the economic activities fill, box by box, to copy into Renta
 * WEB (Orden HAC/277/2026, BOE-A-2026-7041, pages 8 to 10 and 23; the labels are those of
 * docs/fiscalidad/renta-casillas.json, checked on 19-10-2026). One group per activity and one for the
 * totals and the payments on account.
 */

export interface ActivityBox {
  box: string;
  /** The official name of the box, shortened. */
  label: string;
  amount: number;
}

export interface ActivityBoxGroup {
  /** The activity's name, or null for the totals. */
  name: string | null;
  boxes: ActivityBox[];
}

const LABELS: Record<string, string> = {
  '0180': 'Total ingresos computables',
  '0218': 'Suma de gastos',
  '0219': 'Provisiones fiscalmente deducibles',
  '0220': 'Total gastos deducibles',
  '0221': 'Diferencia',
  '0222': 'Provisiones deducibles y gastos de difícil justificación',
  '0223': 'Total gastos deducibles',
  '0224': 'Rendimiento neto',
  '0226': 'Rendimiento neto reducido',
  '0231': 'Suma de rendimientos netos reducidos en estimación directa',
  '0232': 'Reducción del artículo 32.2.1.º de la Ley',
  '0233': 'Reducción del artículo 32.2.3.º de la Ley',
  '0234': 'Reducción por inicio de una actividad (artículo 32.3)',
  '0237': 'Reducción por rendimientos de actividades artísticas (disposición adicional 60.ª)',
  '0235': 'Rendimiento neto reducido total en estimación directa',
  '1465': 'Rendimiento neto previo',
  '1466': 'Minoración por incentivos al empleo',
  '1467': 'Minoración por incentivos a la inversión',
  '1468': 'Rendimiento neto minorado',
  '1474': 'Rendimiento neto de módulos',
  '1475': 'Reducción de carácter general',
  '1479': 'Rendimiento neto de la actividad',
  '1481': 'Rendimiento neto reducido',
  '1482': 'Suma de rendimientos netos reducidos en estimación objetiva',
  '1483': 'Reducción del artículo 32.2.3.º de la Ley',
  '1484': 'Rendimiento neto reducido total en estimación objetiva',
  '1536': 'Total ingresos',
  '1537': 'Rendimiento neto previo',
  '1538': 'Amortización del inmovilizado',
  '1539': 'Rendimiento neto minorado',
  '1548': 'Rendimiento neto de módulos',
  '1549': 'Reducción de carácter general',
  '1551': 'Reducción agricultores jóvenes',
  '1553': 'Rendimiento neto de la actividad',
  '1555': 'Rendimiento neto reducido',
  '1558': 'Suma de rendimientos netos reducidos agrícolas, ganaderos y forestales',
  '1559': 'Reducción del artículo 32.2.3.º de la Ley',
  '1560': 'Rendimiento neto reducido total agrícola, ganadero y forestal',
  '0599': 'Retenciones por rendimientos de actividades económicas',
  '0604': 'Pagos fraccionados ingresados',
};

const boxesOf = (pairs: [string, number][]): ActivityBox[] =>
  pairs.map(([box, amount]) => ({ box, label: LABELS[box], amount: round2(amount) }));

/** Direct estimation (page 8 and 9): 0180 to 0226, by its modality. */
function directBoxes(r: DirectResult, method: 'normal' | 'simplified'): [string, number][] {
  const sums: [string, number][] =
    method === 'normal'
      ? [
          ['0219', r.provisions],
          ['0220', r.expenses + r.provisions],
        ]
      : [
          ['0221', r.difference],
          ['0222', r.provisions],
          ['0223', r.expenses + r.provisions],
        ];
  return [['0180', r.income], ['0218', r.expenses], ...sums, ['0224', r.net], ['0226', r.net]];
}

const modulesBoxes = (r: ModulesResult): [string, number][] => [
  ['1465', r.previous],
  ['1466', r.employment],
  ['1467', r.investment],
  ['1468', r.reduced],
  ['1474', r.modules],
  ['1475', r.general],
  ['1479', r.net],
  ['1481', r.net],
];

const farmBoxes = (r: FarmResult): [string, number][] => [
  ['1536', r.income],
  ['1537', r.previous],
  ['1538', r.depreciation],
  ['1539', r.reduced],
  ['1548', r.modules],
  ['1549', r.general],
  ['1551', r.young],
  ['1553', r.net],
  ['1555', r.net],
];

/** The area of an activity: direct estimation, módulos or farming in módulos. */
const areaOf = (a: ActivityInput): 'direct' | 'modules' | 'agrarian' =>
  a.kind === 'given' ? a.data.area : a.kind;

/** The boxes of one activity, as it was worked out (one already worked out gives its net only). */
function eachBoxes(a: ActivityInput, detail: ActivitiesResult['each'][number]): [string, number][] {
  if (a.kind === 'direct') return directBoxes(detail.detail as DirectResult, a.data.method);
  if (a.kind === 'modules') return modulesBoxes(detail.detail as ModulesResult);
  if (a.kind === 'agrarian') return farmBoxes(detail.detail as FarmResult);
  const net = detail.net;
  const area = a.data.area;
  if (area === 'direct')
    return [
      ['0224', net],
      ['0226', net],
    ];
  return area === 'modules'
    ? [
        ['1479', net],
        ['1481', net],
      ]
    : [
        ['1553', net],
        ['1555', net],
      ];
}

/** The totals of each area that has an activity, and the payments on account. */
function totalBoxes(list: ActivityInput[], r: ActivitiesResult): [string, number][] {
  const sumOf = (area: string) =>
    round2(r.each.filter((_, i) => areaOf(list[i]) === area).reduce((s, e) => s + e.net, 0));
  const has = (area: string) => list.some((a) => areaOf(a) === area);
  const out: [string, number][] = [];
  if (has('direct'))
    out.push(
      ['0231', r.direct],
      ['0232', r.dependentReduction],
      [
        '0233',
        round2(
          r.direct -
            r.dependentReduction -
            r.startReduction -
            (r.artisticReduction ?? 0) -
            r.directTotal
        ),
      ],
      ['0234', r.startReduction],
      ...(r.artisticReduction ? [['0237', r.artisticReduction] as [string, number]] : []),
      ['0235', r.directTotal]
    );
  if (has('modules')) {
    const sum = sumOf('modules');
    out.push(['1482', sum], ['1483', round2(sum - r.modules)], ['1484', r.modules]);
  }
  if (has('agrarian')) {
    const sum = sumOf('agrarian');
    out.push(['1558', sum], ['1559', round2(sum - r.agrarian)], ['1560', r.agrarian]);
  }
  out.push(['0599', r.withheld], ['0604', r.payments]);
  return out;
}

/** Every box the activities fill, per activity and then the totals (zero boxes left out). */
export function activityBoxes(list: ActivityInput[], r: ActivitiesResult): ActivityBoxGroup[] {
  const nonZero = (pairs: [string, number][]) => boxesOf(pairs).filter((b) => b.amount !== 0);
  return [
    ...list.map((a, i) => ({ name: a.name, boxes: nonZero(eachBoxes(a, r.each[i])) })),
    { name: null, boxes: nonZero(totalBoxes(list, r)) },
  ];
}
