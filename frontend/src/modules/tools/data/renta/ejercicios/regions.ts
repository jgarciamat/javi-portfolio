/** How a community's data of a year is built from the next year's, changing only what its manual says. */
import type { Deduction, MinimumAmounts, RentaCcaa, TaxBracket } from '../../../domain/rentaData';

/** A deduction that year: its own figures, page or words, a text change, or its years one before. */
export type DeductionChange = Partial<Deduction> & {
  /** Text replacements in its title, summary, requirements, income-limit note and questions. */
  replace?: [string, string][];
  /** Every year in its texts is one less (they speak of the year of the return, not a fixed date). */
  shiftYears?: boolean;
};

export interface RegionYear {
  /** The scale of that year when it is not the next year's (Manual práctico, c15). */
  scale?: TaxBracket[];
  /** The page of the scale of that year. */
  scaleSource: string;
  /** 'state': the community had no minimums of its own that year (the State's apply). */
  minimums?: 'state' | MinimumAmounts;
  /** Deductions of the next year that did not exist (or did not apply) that year. */
  absent: string[];
  changes: Record<string, DeductionChange>;
  /** Text replacements in every deduction (a definition that changed for all of them). */
  replace?: [string, string][];
  /** Deductions of that year the app does not have: listed so the person copies them from the draft. */
  notInApp: string[];
}

const shift = (text: string): string => text.replace(/\b(20[2-3]\d)\b/g, (y) => String(+y - 1));

/** The texts a person reads of a deduction, changed by `edit`. */
function editTexts(d: Deduction, edit: (text: string) => string): Deduction {
  return {
    ...d,
    title: edit(d.title),
    summary: edit(d.summary),
    ...(d.requirements !== undefined && { requirements: edit(d.requirements) }),
    ...(d.incomeLimit?.note !== undefined && {
      incomeLimit: { ...d.incomeLimit, note: edit(d.incomeLimit.note) },
    }),
    ...(d.checks && {
      checks: d.checks.map((c) => (c.kind === 'ask' ? { ...c, q: edit(c.q) } : c)),
    }),
  };
}

const replaceAll = (pairs: [string, string][]) => (text: string) =>
  pairs.reduce((t, [from, to]) => t.split(from).join(to), text);

/**
 * The community's data of the year from the next year's: its scale and minimums, without the
 * deductions it did not have and with the changes of the ones it had. An id that is not in the
 * data is an error (a change that would be lost without noticing).
 */
export function regionOfYear(c: RentaCcaa, year: RegionYear): RentaCcaa {
  const ids = c.deductions.map((d) => d.id);
  const unknown = [...year.absent, ...Object.keys(year.changes)].filter((id) => !ids.includes(id));
  if (unknown.length) throw new Error(`Unknown ids: ${unknown.join(', ')}`);
  const deductions = c.deductions
    .filter((d) => !year.absent.includes(d.id))
    .map((d) => {
      const { replace = [], shiftYears, ...own } = year.changes[d.id] ?? {};
      const texts = [
        shiftYears ? shift : (t: string) => t,
        replaceAll(year.replace ?? []),
        replaceAll(replace),
      ];
      return { ...editTexts(d, (t) => texts.reduce((acc, f) => f(acc), t)), ...own };
    });
  const { minimums, ...rest } = c;
  return {
    ...rest,
    ...(year.minimums !== 'state' && { minimums: year.minimums ?? minimums }),
    scale: year.scale ?? c.scale,
    scaleSource: year.scaleSource,
    deductions,
    ...(year.notInApp.length > 0 && { notInApp: year.notInApp }),
  };
}
