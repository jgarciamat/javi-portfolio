/**
 * The files of the activities in módulos for the sede of the AEAT: the modelo 131 (DR131_2026.xlsx,
 * pages 01000, DPA00 and DID00) and the modelo 303 of the simplified regime (DR303e26v101.xlsx, pages
 * 01000, 02000 and 03000). Checked on 19-10-2026 against the designs; no file of these two has been
 * imported in the sede yet (docs/fiscalidad/documentos-oficiales.md §7).
 *
 * What is written beyond the boxes, by position of each design:
 * - 131, page 1: kind (13), NIF and names (14-102), year and period (103-108), activity 1 (110
 *   epígrafe, 114 net income, 131 %, 136 result), the code of the reduction of box 09 (556, note 3)
 *   and the account (DID, 12).
 * - 131, page DPA: epígrafe (13), its auxiliary mark for 659.4 and 691.9 (17), season days of last
 *   year (22), Ceuta and Melilla (29), the units and amount of each module in the order of the
 *   order (136…, note 8), the incentives (325, 335), the five indices (345-361) and the days in
 *   business in the quarter (385). The hours of staff (47-111) are left at zero: the units go in
 *   the modules (the sede may ask for the hours: to check when importing).
 * - 303, page 1: «only the simplified regime» (111 = 1); page 2: activity 1 of section B (209…),
 *   C-M and boxes 47-58; page 3: 64-71.
 * The epígrafe goes as its digits without the dot («721.2» → «7212»; the first one of a group).
 */
import type { Result131 } from '@modules/finances/domain/module131';
import type { VatSimplifiedResult } from '@modules/finances/domain/vatSimplified';
import type { TaxBox } from '@modules/finances/domain/types';
import { numberField } from './fixedWidth';
import type { PageFill, Put } from './selfAssessment';

/** What the 131 file needs about the activity besides the boxes. */
export interface Modules131 {
  epigrafe: string;
  /** 659.4 and 691.9: «1» or «2» (note 2 of the DPA page), blank otherwise. */
  aux: string;
  /** Net income of the instalment, and the % applied (box 02 over box 01 of the activity). */
  net: number;
  rate: number;
  units: number[];
  amounts: number[];
  employment: number;
  investment: number;
  /** Special, small business, season, excess and new activity (1 when none). */
  indices: [number, number, number, number, number];
  seasonLastYear: number;
  ceutaMelilla: boolean;
  /** Days in business in the quarter (0 when the whole quarter). */
  quarterDays: number;
  /** Last year's net income: the code of box 09 (note 3 of page 1). */
  lastYearNet: number | null;
}

/** What the 303 file of the simplified regime needs about the activity besides the boxes. */
export interface Simplified303 {
  epigrafe: string;
  aux: string;
  units: number[];
  amounts: number[];
  seasonLastYear: number;
  quarterDays: number;
}

/** The first epígrafe of a group, as its digits («721.1 y 3» → «7211»). */
export const epigrafeCode = (epigrafe: string): string =>
  epigrafe.split(/[ ,]/)[0].replace(/\D/g, '').slice(0, 4);

const cents = (euros: number) => Math.round(euros * 100);
const hundredths = cents;
/** A signed field («N»): written as its text, an «N» first when negative. */
const signed = (pos: number, len: number, euros: number): Put => [
  pos,
  len,
  numberField(cents(euros), len, 'N', pos),
];

/** «0» blank, «1» up to 9,000 €, «2» to 10,000 €, «3» to 11,000 €, «4» to 12,000 € (note 3). */
export function lowIncomeCode(lastYearNet: number | null): number {
  if (lastYearNet === null) return 0;
  const limits = [9000, 10000, 11000, 12000];
  const at = limits.findIndex((l) => lastYearNet <= l);
  return at < 0 ? 0 : at + 1;
}

const boxValue = (boxes: TaxBox[], id: string) => boxes.find((b) => b.box === id)?.amount ?? 0;

/** Page 1 of the 131: the activity of section I and the code of box 09. */
export function page131(m: Modules131, result: Result131): Put[] {
  const sectionI = boxValue(result.boxes, '01') > 0 || boxValue(result.boxes, '02') > 0;
  return [
    ...(sectionI
      ? ([
          [110, 4, epigrafeCode(m.epigrafe)],
          signed(114, 17, m.net),
          [131, 5, hundredths(m.rate)],
          signed(136, 17, boxValue(result.boxes, '02')),
        ] as Put[])
      : []),
    [556, 1, lowIncomeCode(m.lastYearNet)],
  ];
}

/** Page DPA of the 131: the data of the activity, module by module (note 8: in their order). */
export function dpa131(m: Modules131): Put[] {
  const puts: Put[] = [
    [13, 4, epigrafeCode(m.epigrafe)],
    [17, 1, m.aux || ' '],
    [22, 3, Math.round(m.seasonLastYear)],
    [29, 1, m.ceutaMelilla ? 1 : 2],
    [325, 10, cents(m.employment)],
    [335, 10, cents(m.investment)],
    [385, 2, Math.round(m.quarterDays)],
  ];
  m.units.slice(0, 7).forEach((u, i) => {
    puts.push([136 + i * 27, 10, hundredths(u)], [146 + i * 27, 17, cents(m.amounts[i])]);
  });
  m.indices.forEach((index, i) => puts.push([345 + i * 4, 4, hundredths(index)]));
  return puts;
}

/** Page 2 of the 303: activity 1 of section B with its parts C to M (the boxes go by the design). */
export function page303s(s: Simplified303, r: VatSimplifiedResult, last: boolean): Put[] {
  const p = r.parts;
  const puts: Put[] = [
    [209, 4, epigrafeCode(s.epigrafe)],
    [213, 1, s.aux || ' '],
    [403, 17, cents(p.C)],
    [420, 17, cents(p.D)],
  ];
  s.units.slice(0, 7).forEach((u, i) => {
    puts.push([214 + i * 27, 10, hundredths(u)], [224 + i * 27, 17, cents(s.amounts[i])]);
  });
  if (!last) {
    puts.push(
      [437, 3, hundredths(p.Z)],
      [440, 5, hundredths(p.E)],
      [445, 17, cents(p.F)],
      [1105, 3, Math.round(s.seasonLastYear)],
      [1108, 2, Math.round(s.quarterDays)]
    );
  } else {
    puts.push(
      [462, 17, cents(p.G)],
      [479, 3, hundredths(p.H)],
      signed(482, 17, p.I),
      [499, 5, hundredths(p.J)],
      [504, 17, cents(p.K)],
      [521, 17, cents(p.L)],
      [538, 17, cents(p.M)]
    );
  }
  return puts;
}

/** The fills of the simplified 303: page 1 says «only the simplified regime». */
export const fills303s = (page1: Put[], page2: Put[]): PageFill[] => [
  { tag: '01000', puts: page1 },
  { tag: '02000', puts: page2 },
  { tag: '03000', puts: [] },
];
