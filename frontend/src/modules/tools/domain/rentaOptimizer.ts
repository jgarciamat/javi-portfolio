import { computeRenta } from './rentaCalc';
import type { Deduction } from './rentaData';
import { compareJoint, type JointRules } from './rentaJoint';
import {
  number,
  partnerOf,
  propertiesOf,
  setProperty,
  toInput,
  type RentaData,
  type RentaForm,
} from './rentaForm';
import { reductionMissing } from './rentaRentals';
import type { DeductionSaving } from './rentaSavings';
import { round2 } from './round';

/**
 * The reviewer of the return: everything that could lower the tax and is not in the data yet, with
 * what it would save, the question to ask and the official source. It never applies anything on its
 * own: the person confirms each one. Estimates only, with an example amount when none was typed.
 */

const LIRPF = 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764';

export type OpportunityGroup =
  | 'family'
  | 'work'
  | 'reductions'
  | 'property'
  | 'savings'
  | 'joint'
  | 'deductions';

/**
 * Whether the AEAT's draft usually has it: `yes` when a third party reports it to the Tax Agency
 * (pension plans in the modelo 345, donations in the 182, nurseries in the 233…), `no` when only
 * the person knows it (a move for work, an ascendant living at home…), `maybe` otherwise.
 */
export type DraftKnows = 'yes' | 'no' | 'maybe';

export interface Opportunity {
  /** Text key (tools.renta.opt.<id>) or, for a deduction, its id. */
  id: string;
  group: OpportunityGroup;
  /** Euros less to pay (or more to get back) with it, the other data as it is. */
  saving: number;
  /** The amount the saving was worked out with when the person typed none. */
  example: number | null;
  /** What to change in the form for it (the person confirms it). */
  patch: Partial<RentaForm>;
  draftKnows: DraftKnows;
  source: string;
  /** For a deduction: its title, as the data names it. */
  title?: string;
}

export interface OptimizerData extends RentaData {
  joint: JointRules;
}

/** What the person has not told the planner and changes the result. */
export type MissingKey = 'ccaa' | 'socialSecurity' | 'withheld' | 'age' | 'jointKind';

export interface Optimization {
  items: Opportunity[];
  /** Everything together is less than the sum: each one is estimated on its own. */
  total: number;
  missing: MissingKey[];
}

interface Candidate {
  id: string;
  group: OpportunityGroup;
  patch: Partial<RentaForm>;
  example: number | null;
  draftKnows: DraftKnows;
  source: string;
}

const UNION_EXAMPLE = 120;
const PLAN_LIMIT = 1500;
const SPOUSE_PLAN_LIMIT = 1000;
const LOSS_EXAMPLE = 1000;
const CONSTRUCTION_EXAMPLE = 60000;

/** The first rented property with no cost nor cadastral value of the building (-1: none). */
export const depreciationMissing = (form: RentaForm): number =>
  propertiesOf(form).findIndex((p) => number(p.cost) <= 0 && number(p.cadastralBuilding) <= 0);

const works = (form: RentaForm) => number(form.gross) > number(form.nonSalary) && !form.retired;

/** The work, family and reduction items that could apply to the person. */
function personalCandidates(form: RentaForm): Candidate[] {
  const list: Candidate[] = [];
  const add = (c: Candidate, when: boolean) => when && list.push(c);
  const plan = number(form.pension);
  add(
    {
      id: 'pensionPlan',
      group: 'reductions',
      patch: { pension: String(PLAN_LIMIT) },
      example: round2(PLAN_LIMIT - plan),
      draftKnows: 'yes',
      source: `${LIRPF}#a51`,
    },
    number(form.gross) > 0 && plan < PLAN_LIMIT
  );
  add(
    {
      id: 'spousePlan',
      group: 'reductions',
      patch: { spousePlan: String(SPOUSE_PLAN_LIMIT) },
      example: round2(SPOUSE_PLAN_LIMIT - number(form.spousePlan)),
      draftKnows: 'yes',
      source: `${LIRPF}#a51`,
    },
    // Art. 51.7: a spouse with income from work and activities under 8,000 €.
    form.joint === 'couple' &&
      number(form.partner.gross) < 8000 &&
      number(form.spousePlan) < SPOUSE_PLAN_LIMIT
  );
  add(
    {
      id: 'unionFees',
      group: 'work',
      patch: { workExpenses: { ...form.workExpenses, 'cuotas-sindicales': String(UNION_EXAMPLE) } },
      example: UNION_EXAMPLE,
      draftKnows: 'maybe',
      source: `${LIRPF}#a19`,
    },
    works(form) && !form.workExpenses['cuotas-sindicales']
  );
  add(
    {
      id: 'mobility',
      group: 'work',
      patch: { mobility: true },
      example: null,
      draftKnows: 'no',
      source: `${LIRPF}#a19`,
    },
    works(form) && !form.mobility
  );
  add(
    {
      id: 'disability',
      group: 'family',
      patch: { disability: 33 },
      example: null,
      draftKnows: 'maybe',
      source: `${LIRPF}#a60`,
    },
    form.disability === 0
  );
  add(
    {
      id: 'assistance',
      group: 'family',
      patch: { assistance: true },
      example: null,
      draftKnows: 'maybe',
      source: `${LIRPF}#a60`,
    },
    form.disability === 33 && !form.assistance
  );
  add(
    {
      id: 'ascendant',
      group: 'family',
      patch: { ascendants: [{ over75: false, disability: 0 }] },
      example: null,
      draftKnows: 'no',
      source: `${LIRPF}#a59`,
    },
    form.ascendants.length === 0
  );
  return list;
}

/** The property and savings items: reductions of the rent, depreciation, earlier losses. */
function assetCandidates(form: RentaForm): Candidate[] {
  const list: Candidate[] = [];
  // The reduction of a home let out as a dwelling that any contract can have: the general 50 %
  // (art. 23.2.1.º a), for a home whose contract date is not given; the higher ones need more
  // conditions and are left to the person. Property by property (rentaRentals.ts).
  const noDate = propertiesOf(form).findIndex(reductionMissing);
  if (noDate >= 0)
    list.push({
      id: 'rentalReduction',
      group: 'property',
      patch: setProperty(form, noDate, { contract: 'after' }),
      example: null,
      draftKnows: 'no',
      source: `${LIRPF}#a23`,
    });
  const noCost = depreciationMissing(form);
  if (noCost >= 0)
    list.push({
      id: 'rentalDepreciation',
      group: 'property',
      patch: setProperty(form, noCost, { cost: String(CONSTRUCTION_EXAMPLE) }),
      example: CONSTRUCTION_EXAMPLE,
      draftKnows: 'no',
      source: `${LIRPF}#a23`,
    });
  const savings = number(form.savings);
  if (!form.savingsDetail && savings > 0)
    list.push({
      id: 'earlierLosses',
      group: 'savings',
      // Earlier losses go against this year's gains (art. 49): as an example, 1,000 € less.
      patch: { savings: String(round2(Math.max(0, savings - LOSS_EXAMPLE))) },
      example: Math.min(savings, LOSS_EXAMPLE),
      draftKnows: 'yes',
      source: `${LIRPF}#a49`,
    });
  return list;
}

/** What the person has not said and changes the result. */
function missingOf(form: RentaForm): MissingKey[] {
  const missing: MissingKey[] = [];
  if (!form.ccaaId) missing.push('ccaa');
  if (number(form.gross) > 0 && form.socialSecurity.trim() === '') missing.push('socialSecurity');
  if (number(form.gross) > 0 && form.withheld.trim() === '') missing.push('withheld');
  if (form.age.trim() === '') missing.push('age');
  if (form.joint === '') missing.push('jointKind');
  return missing;
}

/** The joint return when it is better than the individual ones (LIRPF arts. 82 to 84). */
function jointItem(form: RentaForm, data: OptimizerData): Opportunity | null {
  if (form.joint !== 'couple' && form.joint !== 'single') return null;
  const input = toInput(form, data);
  const joint = compareJoint(input, form.joint, form.joint === 'couple' ? partnerOf(form) : null, {
    livesWithOtherParent: form.otherParent,
    rules: data.joint,
  });
  if (!joint || joint.saving <= 0) return null;
  // The saving is for the whole family unit: the individual returns of both against the joint one.
  return {
    id: 'joint',
    group: 'joint',
    saving: round2(joint.saving),
    example: null,
    patch: {},
    draftKnows: 'maybe',
    source: `${LIRPF}#a84`,
  };
}

/** What the form saves against the same form with `patch` (e.g. an amount typed, taken away). */
export function savingOver(form: RentaForm, data: RentaData, patch: Partial<RentaForm>): number {
  const without = computeRenta(toInput({ ...form, ...patch }, data)).result;
  return round2(without - computeRenta(toInput(form, data)).result);
}

/**
 * Everything that could lower the tax, the highest saving first: the personal and family data, the
 * reductions, the property and savings, the joint return and the deductions that could apply
 * (`deductions`, with what each one saves from rentaSavings.ts).
 */
export function optimize(
  form: RentaForm,
  data: OptimizerData,
  deductions: { list: Deduction[]; savings: Record<string, DeductionSaving> }
): Optimization {
  const base = computeRenta(toInput(form, data));
  const items: Opportunity[] = [];
  for (const c of [...personalCandidates(form), ...assetCandidates(form)]) {
    const after = computeRenta(toInput({ ...form, ...c.patch }, data));
    const saving = round2(base.result - after.result);
    if (saving > 0) items.push({ ...c, saving });
  }
  const joint = jointItem(form, data);
  if (joint) items.push(joint);
  for (const d of deductions.list) {
    const s = deductions.savings[d.id];
    if (!s || s.blocked || s.saving <= 0) continue;
    items.push({
      id: d.id,
      group: 'deductions',
      saving: s.saving,
      example: s.example,
      patch: { choices: { ...form.choices, [d.id]: { on: true, amount: '', units: '' } } },
      draftKnows: d.refundable ? 'yes' : d.id.startsWith('estado-') ? 'maybe' : 'no',
      source: d.url,
      title: d.title,
    });
  }
  items.sort((a, b) => b.saving - a.saving);
  return {
    items,
    total: round2(items.reduce((sum, i) => sum + i.saving, 0)),
    missing: missingOf(form),
  };
}
