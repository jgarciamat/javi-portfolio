import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { parseDecimal } from '@shared/utils/numbers';
import {
  summary180,
  summary190,
  summary347,
  type Summary347,
  type SummaryWarning,
  type Warning347,
  type YearSummary,
} from '../../domain/annualSummaries';
import { figuresFor } from '../../domain/fiscalFigures';
import { wealthWarnings, type AbroadBlock, type WealthWarning } from '../../domain/wealthWarnings';
import { Boxes } from './AutonomoDraftResult';
import { toWithholdingQuarter, withholdingsOf } from './withholdingForm';
import type { ManualForm } from './AutonomoManual';

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

function Operations({ summary, year }: { summary: Summary347; year: number }) {
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
              who: t(key(`key.${r.key}`), { who: r.name }),
              nif: r.nif,
              amount: r.total,
            }))}
          />
          <p className="section-hint">{t(key('deadlineFebruary'), { year: year + 1 })}</p>
        </>
      )}
      <p className="section-hint">{t(key('note347'))}</p>
      <Warnings items={summary.warnings.map((w) => warning347(t, w))} />
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
export function AnnualPanel({ form, year }: { form: ManualForm; year: number }) {
  const { t } = useI18n();
  const quarters = withholdingsOf(form).map(toWithholdingQuarter);
  const figures = figuresFor(year);
  return (
    <section className="autonomo-panel autonomo-annual" aria-labelledby="autonomo-annual-title">
      <h3 id="autonomo-annual-title">{t(key('title'), { year })}</h3>
      {figures?.provisional && <p className="section-hint">{t(key('provisional'), { year })}</p>}
      <Withholding summary={summary190(year, form.invoices, quarters)} year={year} />
      <Withholding summary={summary180(year, form.invoices, quarters)} year={year} />
      <Operations summary={summary347(year, form.invoices)} year={year} />
      <Wealth year={year} />
      <p className="section-hint">{t(key('note'))}</p>
    </section>
  );
}
