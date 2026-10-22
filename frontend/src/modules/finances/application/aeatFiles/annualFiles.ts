/**
 * The checks and the writer of the informative returns 190, 180 and 347 from the yearly summaries
 * the app works out (domain/annualSummaries.ts). What the summaries do not keep (the province of each
 * person, the premises of each rent) is typed on the device, record by record.
 */
import type { PayeeRecord, Record347 } from '@modules/finances/domain/annualSummaries';
import { blank, type Check, contactChecks, error, warn } from './checks';
import { nifKind } from './ids';
import {
  type InformativeHead,
  type Landlord180,
  type Payee190,
  type Premises,
  write180,
  write190,
  write347,
} from './informative';
import type { Declarant, RecordExtra, SedeSource, Writer } from './models';
import { provincesOf } from './provinces';

export type Informative = Extract<SedeSource, { model: '190' | '180' | '347' }>;

/** The key of what the person types for a record: model, key and tax id (or name). */
export const recordId = (
  model: string,
  r: { key?: string | null; nif: string | null; name: string }
): string => `${model}:${r.key ?? ''}:${r.nif ?? r.name}`;

const headOf = (source: Informative, d: Declarant): InformativeHead => ({
  model: source.model,
  year: source.year,
  nif: d.nif,
  name: `${d.surname} ${d.name}`,
  phone: d.phone,
  contact: d.contact,
  email: d.email,
});

const extraOf = (d: Declarant, id: string): RecordExtra => d.records[id] ?? { province: '' };

/** A Spanish tax id and a province for a record of `model` (who: its name, for the message). */
function personChecks(
  model: '190' | '180' | '347',
  r: { nif: string | null; name: string },
  extra: RecordExtra
): Check[] {
  const checks: Check[] = [];
  const who = r.name || '—';
  if (r.nif === null || nifKind(r.nif) === null) checks.push(error('personNif', { who }));
  if (!provincesOf(model).some(([code]) => code === extra.province))
    checks.push(error('province', { who }));
  return checks;
}

/** Totals typed by hand have no person behind them: the forms need one record per person. */
const typedChecks = (model: '190' | '180', records: PayeeRecord[]): Check[] =>
  records.filter((r) => r.typed).map((r) => error(`typed${model}`, { key: r.key ?? '' }));

function plan190(source: Extract<Informative, { model: '190' }>, d: Declarant): Writer {
  const checks: Check[] = [...contactChecks(d)];
  // DISENOS_LOGICOS_190_2025.pdf is the last one published: later years are NO CONFIRMADO.
  if (source.year !== 2025) checks.push(warn('design190', { year: source.year }));
  if (blank(d.email)) checks.push(warn('email190'));
  checks.push(...typedChecks('190', source.summary.records));
  const people = source.summary.records.filter((r) => !r.typed);
  for (const r of people) {
    const extra = extraOf(d, recordId('190', r));
    checks.push(...personChecks('190', r, extra));
    if (r.subkey === null) checks.push(error('subkey190', { who: r.name || '—' }));
  }
  const payees = people.map(
    (r) => ({ ...r, province: extraOf(d, recordId('190', r)).province }) as Payee190
  );
  return { checks, kind: null, period: '', write: () => write190(headOf(source, d), payees) };
}

const NO_PREMISES: Premises = {
  situation: '1',
  cadastre: '',
  streetType: 'CL',
  street: '',
  number: '',
  floor: '',
  door: '',
  town: '',
  municipality: '',
  municipalityCode: '',
  province: '',
  postcode: '',
};

/** The premises typed for a record, the kind of street «CL» (calle) unless another one is typed. */
const premisesOf = (extra: RecordExtra): Premises => {
  const p = { ...NO_PREMISES, ...extra.premises };
  return { ...p, cadastre: p.cadastre.toUpperCase(), streetType: p.streetType || 'CL' };
};

/** The premises of a rent: situation, cadastral reference (unless 4) and the address [DR180]. */
function premisesChecks(p: Premises, who: string): Check[] {
  const checks: Check[] = [];
  if (p.situation !== '4' && !/^[0-9A-Z]{20}$/.test(p.cadastre))
    checks.push(error('cadastre', { who }));
  const address =
    !blank(p.street) &&
    !blank(p.municipality) &&
    /^\d{5}$/.test(p.municipalityCode) &&
    /^\d{5}$/.test(p.postcode) &&
    provincesOf('180').some(([code]) => code === p.province);
  if (!address) checks.push(error('address', { who }));
  return checks;
}

function plan180(source: Extract<Informative, { model: '180' }>, d: Declarant): Writer {
  // DR_Mod_180_2023.pdf is the last design published (NO CONFIRMADO for later years).
  const checks: Check[] = [...contactChecks(d), warn('design180')];
  checks.push(...typedChecks('180', source.summary.records));
  const people = source.summary.records.filter((r) => !r.typed);
  const landlords: Landlord180[] = [];
  for (const r of people) {
    const extra = extraOf(d, recordId('180', r));
    const premises = premisesOf(extra);
    checks.push(...personChecks('180', r, extra), ...premisesChecks(premises, r.name || '—'));
    // Written only when the checks pass: then the NIF is there.
    landlords.push({ ...r, nif: r.nif as string, province: extra.province, premises });
  }
  return { checks, kind: null, period: '', write: () => write180(headOf(source, d), landlords) };
}

function plan347(source: Extract<Informative, { model: '347' }>, d: Declarant): Writer {
  const { summary } = source;
  const checks: Check[] = [...contactChecks(d)];
  if (!summary.known) checks.push(warn('figures347', { year: source.year }));
  if (summary.records.length === 0) checks.push(error('none347'));
  for (const r of summary.records) {
    checks.push(...personChecks('347', r, extraOf(d, recordId('347', r))));
    if (r.withheld) checks.push(warn('withheld347', { who: r.name }));
    // The amount by the cash rule cannot be guessed: without the collections, no file.
    if (r.cash && r.cashTotal === null) checks.push(error('cash347', { who: r.name }));
  }
  for (const w of summary.warnings) {
    if (w.code === 'notSubject') checks.push(warn('notSubject347', { who: w.who }));
    if (w.code === 'carriedTwice') checks.push(warn('carriedTwice347', { who: w.who }));
  }
  const people = summary.records.map((r: Record347) => ({
    ...r,
    nif: r.nif as string,
    province: extraOf(d, recordId('347', r)).province,
  }));
  return { checks, kind: null, period: '', write: () => write347(headOf(source, d), people) };
}

/** The writer of an informative return, with its checks. */
export function planInformative(source: Informative, d: Declarant): Writer {
  if (source.model === '190') return plan190(source, d);
  if (source.model === '180') return plan180(source, d);
  return plan347(source, d);
}

/** The records of an informative return that ask for data: id, who and tax id. */
export function recordsOf(
  source: Informative
): { id: string; who: string; nif: string | null; key: string | null }[] {
  const list: { key?: string | null; nif: string | null; name: string; typed?: boolean }[] =
    source.summary.records;
  const rows = list
    .filter((r) => !r.typed)
    .map((r) => ({
      id: recordId(source.model, r),
      who: r.name,
      nif: r.nif,
      // Only the 347 shows its key (A purchases, B sales): every record of it has one.
      key: source.model === '347' ? (r.key as string) : null,
    }));
  // One person may have two records of the 347 (cash operations apart): their data is asked once.
  return rows.filter((r, i) => rows.findIndex((x) => x.id === r.id) === i);
}
