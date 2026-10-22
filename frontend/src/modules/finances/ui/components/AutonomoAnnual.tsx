import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { parseDecimal } from '@shared/utils/numbers';
import {
  summary180,
  summary190,
  summary347,
  type Carried347,
  type Record347,
  type Summary347,
  type SummaryWarning,
  type Warning347,
  type YearSummary,
} from '../../domain/annualSummaries';
import { figuresFor } from '../../domain/fiscalFigures';
import { wealthWarnings, type AbroadBlock, type WealthWarning } from '../../domain/wealthWarnings';
import { AnnualFormPreviews } from '@modules/taxforms/ui/FormPreviews';
import { Boxes } from './AutonomoDraftResult';
import { SedeFiles, sedeSourcesOfYear } from './SedeFiles';
import { toWithholdingQuarter, withholdingsOf } from './withholdingForm';
import type { Carried347Form, ManualForm } from './AutonomoManual';

type Translate = ReturnType<typeof useI18n>['t'];
type Money = ReturnType<typeof useFormat>['money'];

const key = (k: string) => `app.autonomo.annual.${k}`;

/** A warning of the 190 or the 180 in words. */
function summaryWarning(t: Translate, w: SummaryWarning): string {
  if (w.code === 'nif' || w.code === 'subkey') return t(key(`warn.${w.code}`), { who: w.who });
  if (w.code === 'typed') return t(key(`warn.typed.${w.part}`));
  return t(key('warn.cadastre'));
}

const warning347 = (t: Translate, w: Warning347) => t(key(`warn347.${w.code}`), { who: w.who });

function Warnings({ items }: { items: string[] }) {
  const { t } = useI18n();
  if (items.length === 0) return null;
  return (
    <ul className="autonomo-checks-list">
      {items.map((text) => (
        <li key={text} className="autonomo-check autonomo-check--warn">
          <p>
            <strong className="autonomo-check-level">{t('app.autonomo.checks.level.warn')}</strong>{' '}
            {text}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** The records of a summary: who, tax id and amount. */
function Records({ rows }: { rows: { who: string; nif: string | null; amount: number }[] }) {
  const { t } = useI18n();
  const { money } = useFormat();
  return (
    <table className="autonomo-annual-records">
      <thead>
        <tr>
          <th>{t(key('who'))}</th>
          <th>{t(key('nif'))}</th>
          <th>{t('app.autonomo.amount')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.who}-${i}`}>
            <td>{r.who}</td>
            <td>{r.nif ?? '—'}</td>
            <td>{money(r.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Withholding({ summary, year }: { summary: YearSummary; year: number }) {
  const { t } = useI18n();
  if (summary.records.length === 0) return null;
  return (
    <div className="autonomo-annual-model">
      <Boxes title={t('app.autonomo.model', { model: summary.model })} boxes={summary.boxes} />
      <Records
        rows={summary.records.map((r) => ({
          who: r.typed ? t(key('typed')) : r.name,
          nif: r.nif,
          amount: r.paid + r.inKind,
        }))}
      />
      <p className="section-hint">{t(key('deadlineJanuary'), { year: year + 1 })}</p>
      <Warnings items={summary.warnings.map((w) => summaryWarning(t, w))} />
    </div>
  );
}

/** A person of the 347, with the amount accrued by the cash rule when the record is a cash one. */
function whoOf347(t: Translate, money: Money, r: Record347): string {
  const who = t(key(`key.${r.key}`), { who: r.name });
  if (!r.cash) return who;
  if (r.cashTotal === null) return t(key('cash347Unknown'), { who });
  return t(key('cash347'), { who, amount: money(r.cashTotal) });
}

const NEW_CARRIED = (year: number): Carried347Form => ({
  year,
  key: 'B',
  name: '',
  nif: '',
  amount: '',
});

/** The people typed for the 347 of `year`, as the summary takes them (empty lines left out). */
export function carriedOfYear(rows: Carried347Form[] | undefined, year: number): Carried347[] {
  return (rows ?? [])
    .filter((r) => r.year === year && amount(r.amount) > 0 && (r.name.trim() || r.nif.trim()))
    .map((r) => ({
      key: r.key,
      nif: r.nif.trim() ? r.nif.trim().toUpperCase() : null,
      name: r.name.trim(),
      amount: amount(r.amount),
    }));
}

/**
 * The cash invoices of the year before still pending on 31 December, typed person by person: the
 * screen of a year has only its own invoices, and all of that accrues in this one [LIVA 163 terdecies].
 */
function Carried({
  rows,
  year,
  threshold,
  onChange,
}: {
  rows: Carried347Form[];
  year: number;
  threshold: number;
  onChange: (rows: Carried347Form[]) => void;
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  const mine = rows.filter((r) => r.year === year);
  const others = rows.filter((r) => r.year !== year);
  const set = (list: Carried347Form[]) => onChange([...others, ...list]);
  const patch = (i: number, p: Partial<Carried347Form>) =>
    set(mine.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const prev = year - 1;
  return (
    <fieldset className="autonomo-annual-carried">
      <legend>{t(key('carried.title'), { year: prev })}</legend>
      <p className="section-hint">
        {t(key('carried.intro'), { year, prev, amount: money(threshold) })}
      </p>
      {mine.map((r, i) => (
        <div
          key={i}
          className="autonomo-annual-fields"
          role="group"
          aria-label={t(key('carried.row'), { n: i + 1 })}
        >
          <label className="autonomo-annual-field">
            <span>{t(key('carried.key'))}</span>
            <select
              value={r.key}
              onChange={(e) => patch(i, { key: e.target.value as Carried347Form['key'] })}
            >
              <option value="B">{t(key('carried.sales'))}</option>
              <option value="A">{t(key('carried.purchases'))}</option>
            </select>
          </label>
          <label className="autonomo-annual-field">
            <span>{t(key('carried.name'))}</span>
            <input value={r.name} onChange={(e) => patch(i, { name: e.target.value })} />
          </label>
          <label className="autonomo-annual-field">
            <span>{t(key('nif'))}</span>
            <input
              value={r.nif}
              autoCapitalize="characters"
              onChange={(e) => patch(i, { nif: e.target.value })}
            />
          </label>
          <label className="autonomo-annual-field">
            <span>{t(key('carried.amount'), { prev })}</span>
            <input
              inputMode="decimal"
              value={r.amount}
              onChange={(e) => patch(i, { amount: e.target.value })}
            />
          </label>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => set(mine.filter((_, j) => j !== i))}
          >
            {t(key('carried.remove'), { n: i + 1 })}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn-secondary"
        onClick={() => set([...mine, NEW_CARRIED(year)])}
      >
        {t(key('carried.add'))}
      </button>
    </fieldset>
  );
}

function Operations({
  summary,
  year,
  carried,
}: {
  summary: Summary347;
  year: number;
  carried?: { rows: Carried347Form[]; onChange: (rows: Carried347Form[]) => void };
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  return (
    <div className="autonomo-annual-model">
      <h4>{t('app.autonomo.model', { model: '347' })}</h4>
      {summary.records.length === 0 ? (
        <p>{t(key('none347'), { amount: money(summary.threshold) })}</p>
      ) : (
        <>
          <Boxes title={t(key('summary'))} boxes={summary.boxes} />
          <Records
            rows={summary.records.map((r) => ({
              who: whoOf347(t, money, r),
              nif: r.nif,
              amount: r.total,
            }))}
          />
          <p className="section-hint">{t(key('deadlineFebruary'), { year: year + 1 })}</p>
        </>
      )}
      <p className="section-hint">{t(key('note347'))}</p>
      <Warnings items={summary.warnings.map((w) => warning347(t, w))} />
      {carried && (
        <Carried
          rows={carried.rows}
          year={year}
          threshold={summary.threshold}
          onChange={carried.onChange}
        />
      )}
    </div>
  );
}

const BLOCKS: AbroadBlock[] = ['accounts', 'securities', 'realEstate', 'crypto'];
const WEALTH = ['assets', 'home', 'debts'] as const;

const amount = (text: string) => {
  const n = parseDecimal(text);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function wealthText(t: Translate, money: Money, w: WealthWarning): string {
  if (w.model === '714') return t(key(`wealth.714.${w.reason}`), { amount: money(w.value) });
  return t(key(`wealth.abroad.${w.reason}`), {
    model: w.model,
    what: t(key(`block.${w.block}`)),
    amount: money(w.value),
  });
}

/** What the person has abroad and in total: only to warn of the 720, the 721 and the 714. */
function Wealth({ year }: { year: number }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const [values, setValues] = useState<Record<string, string>>({});
  const field = (name: string) => (
    <label key={name} className="autonomo-annual-field">
      <span>{t(key(`field.${name}`))}</span>
      <input
        inputMode="decimal"
        value={values[name] ?? ''}
        onChange={(e) => setValues({ ...values, [name]: e.target.value })}
      />
    </label>
  );
  const warnings = wealthWarnings({
    year,
    abroad: Object.fromEntries(BLOCKS.map((b) => [b, amount(values[b] ?? '')])),
    wealth: {
      assets: amount(values.assets ?? ''),
      home: amount(values.home ?? ''),
      debts: amount(values.debts ?? ''),
    },
  });
  return (
    <details className="autonomo-annual-wealth">
      <summary>{t(key('wealth.title'))}</summary>
      <p className="section-hint">{t(key('wealth.intro'))}</p>
      <div className="autonomo-annual-fields">{[...BLOCKS, ...WEALTH].map(field)}</div>
      {warnings.length === 0 ? (
        <p>{t(key('wealth.none'))}</p>
      ) : (
        <Warnings items={warnings.map((w) => wealthText(t, money, w))} />
      )}
    </details>
  );
}

/**
 * The yearly summaries of the selected year (190, 180 and 347) and the warnings of the assets
 * abroad and the wealth tax, worked out on the device: no draft is spent.
 */
export function AnnualPanel({
  form,
  year,
  onChange,
}: {
  form: ManualForm;
  year: number;
  /** To keep what is typed for the 347 with the form; without it the 347 only reads the invoices. */
  onChange?: (form: ManualForm) => void;
}) {
  const { t } = useI18n();
  const quarters = withholdingsOf(form).map(toWithholdingQuarter);
  const figures = figuresFor(year);
  const s190 = summary190(year, form.invoices, quarters);
  const s180 = summary180(year, form.invoices, quarters);
  const s347 = summary347(year, form.invoices, carriedOfYear(form.carried347, year));
  const carried = onChange && {
    rows: form.carried347 ?? [],
    onChange: (rows: Carried347Form[]) => onChange({ ...form, carried347: rows }),
  };
  return (
    <section className="autonomo-panel autonomo-annual" aria-labelledby="autonomo-annual-title">
      <h3 id="autonomo-annual-title">{t(key('title'), { year })}</h3>
      {figures?.provisional && <p className="section-hint">{t(key('provisional'), { year })}</p>}
      <Withholding summary={s190} year={year} />
      <Withholding summary={s180} year={year} />
      <Operations summary={s347} year={year} carried={carried} />
      <AnnualFormPreviews m190={s190} m180={s180} m347={s347} year={year} />
      <SedeFiles sources={sedeSourcesOfYear(year, s190, s180, s347)} />
      <Wealth year={year} />
      <p className="section-hint">{t(key('note'))}</p>
    </section>
  );
}
