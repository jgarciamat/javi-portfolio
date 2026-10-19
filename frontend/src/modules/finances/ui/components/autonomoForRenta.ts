import { storage } from '@shared/utils/storage';
import type { AnnualActivity } from '@modules/finances/domain/annualActivity';
import { NO_EXTRAS, emptyManual, type Extras, type ManualForm } from './AutonomoManual';
import { annualOf } from './autonomoInputs';
import { filingQuarter, type Quarter } from '../../domain/autonomoQuarters';

/**
 * The self-employed year for the Renta: which year the data on this device is of, and the annual
 * contract of a given year (docs/fiscalidad/contrato-actividad-anual.md). The form keeps no year of
 * its own: the dates of the imported invoices say it.
 */

/** Where the self-employed screen keeps its form and its options on the device. */
export const MANUAL_KEY = 'mm_autonomo_manual2';
export const EXTRAS_KEY = 'mm_autonomo_extras';

/** The years of the imported invoices, the one with most invoices first (ties: the latest). */
export function invoiceYears(manual: Pick<ManualForm, 'invoices'>): number[] {
  const count = new Map<number, number>();
  for (const i of manual.invoices) {
    const year = Number(i.date.slice(0, 4));
    if (/^\d{4}-/.test(i.date)) count.set(year, (count.get(year) ?? 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]).map(([y]) => y);
}

/** The year to open the screen with: that of the invoices when it is one of `years`. */
export function preferredYear(
  manual: Pick<ManualForm, 'invoices'>,
  years: readonly number[],
  fallback: number
): number {
  return invoiceYears(manual).find((y) => years.includes(y)) ?? fallback;
}

/**
 * The year and quarter to open the screen with on `now`: the quarter to file (the last one ended),
 * or, when the invoices are of another year, that year and its last quarter with invoices.
 */
export function openingPeriod(
  manual: Pick<ManualForm, 'invoices'>,
  years: readonly number[],
  now: Date
): { year: number; quarter: Quarter } {
  const filing = filingQuarter(now);
  const year = preferredYear(manual, years, filing.year);
  if (year === filing.year) return filing;
  const quarters = manual.invoices
    .filter((i) => i.date.startsWith(`${year}-`))
    .map((i) => Math.ceil(Number(i.date.slice(5, 7)) / 3))
    .filter((q) => q >= 1 && q <= 4);
  return { year, quarter: (quarters.length ? Math.max(...quarters) : 4) as Quarter };
}

/** Whether something was typed or imported in the form. */
export const hasManualData = (manual: ManualForm): boolean =>
  JSON.stringify(manual) !== JSON.stringify(emptyManual());

/** The form and the options as saved on this device. */
export function storedAutonomo(): { manual: ManualForm; extras: Extras } {
  return {
    manual: { ...emptyManual(), ...storage.getJSON<Partial<ManualForm>>(MANUAL_KEY, {}) },
    extras: { ...NO_EXTRAS, ...storage.getJSON<Partial<Extras>>(EXTRAS_KEY, {}) },
  };
}

export interface YearCheck {
  /** The data is of this year (or nothing says otherwise: typed by hand, with no invoices). */
  matches: boolean;
  /** The years the invoices are of, most invoices first. */
  years: number[];
}

/** Whether the form is of `year`: with invoices, at least one of them is dated in it. */
export function yearCheck(manual: Pick<ManualForm, 'invoices'>, year: number): YearCheck {
  const years = invoiceYears(manual);
  return { matches: years.length === 0 || years.includes(year), years };
}

export interface DeviceAutonomo extends YearCheck {
  /** The year of the activity, or null when nothing was typed or imported. */
  annual: AnnualActivity | null;
}

/** The self-employed year saved on this device, as the Renta of `year` takes it. */
export function autonomoOnDevice(year: number): DeviceAutonomo {
  const { manual, extras } = storedAutonomo();
  const check = yearCheck(manual, year);
  return { ...check, annual: hasManualData(manual) ? annualOf(manual, extras, year) : null };
}
