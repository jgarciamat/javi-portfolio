import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { parseDecimal } from '@shared/utils/numbers';
import { missingQuarters, type ImportCheck } from '../../domain/importChecks';
import { toManualData, type ManualForm } from './AutonomoManual';

export interface Summary {
  income: number;
  expenses: number;
  invoices: number;
  missing: ReturnType<typeof missingQuarters>;
  warnings: number;
  empty: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const amount = (text: string) => {
  const parsed = parseDecimal(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * The figures of the year up to the quarter of the draft, as the draft will take them: the income
 * without VAT and the expenses as paid. With the filed modelo 130 on, its totals stand for the
 * earlier quarters.
 */
export function summarize(
  manual: ManualForm,
  quarter: number,
  checks: ImportCheck[],
  empty: boolean
): Summary {
  const data = toManualData(manual);
  const prior = manual.prior.on && quarter > 1;
  const quarters = data.quarters.slice(prior ? quarter - 1 : 0, quarter);
  const income = quarters.reduce(
    (s, q) => s + q.income.r21 + q.income.r10 + q.income.r4 + q.income.r0,
    prior ? amount(manual.prior.income) : 0
  );
  const expenses = quarters.reduce(
    (s, q) => s + q.expenses.reduce((t, e) => t + e.amount, 0),
    prior ? amount(manual.prior.expenses) : 0
  );
  return {
    income: round2(income),
    expenses: round2(expenses),
    invoices: manual.invoices.length,
    missing: missingQuarters(checks),
    warnings: checks.filter((c) => c.level === 'warn').length,
    empty,
  };
}

/**
 * Always in sight under the header of the app: the period of the draft, what the year adds up to,
 * the invoices brought in and what is still missing. On a phone it is one compact line.
 */
export function AutonomoSummary({
  year,
  quarter,
  summary,
  onPeriod,
  onQuarter,
  onChecks,
}: {
  year: number;
  quarter: number;
  summary: Summary;
  /** Goes to the period of the draft. */
  onPeriod: () => void;
  /** Goes to the panel of a quarter. */
  onQuarter: (quarter: number) => void;
  /** Goes to the warnings. */
  onChecks: () => void;
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  const missing = summary.missing.map((m) =>
    t(
      `app.autonomo.summary.missing.${
        m.income && m.expenses ? 'both' : m.income ? 'income' : 'expenses'
      }`,
      { n: m.quarter }
    )
  );
  return (
    <aside className="autonomo-sum" aria-label={t('app.autonomo.summary.label')}>
      <button type="button" className="autonomo-sum-item autonomo-sum-period" onClick={onPeriod}>
        <span className="autonomo-sum-long">
          {t('app.autonomo.summary.period', { year, n: quarter })}
        </span>
        <span className="autonomo-sum-short" aria-hidden="true">
          {t('app.autonomo.summary.periodShort', { year, n: quarter })}
        </span>
      </button>
      <span className="autonomo-sum-item">
        <span className="autonomo-sum-key">{t('app.autonomo.summary.income')}</span>
        <span className="autonomo-sum-sign" aria-hidden="true">
          +
        </span>
        <strong>{money(summary.income)}</strong>
      </span>
      <span className="autonomo-sum-item">
        <span className="autonomo-sum-key">{t('app.autonomo.summary.expenses')}</span>
        <span className="autonomo-sum-sign" aria-hidden="true">
          −
        </span>
        <strong>{money(summary.expenses)}</strong>
      </span>
      <span className="autonomo-sum-item">
        {t('app.autonomo.summary.invoices', { n: summary.invoices })}
      </span>
      {missing.map((text, i) => (
        <button
          key={summary.missing[i].quarter}
          type="button"
          className="autonomo-sum-item autonomo-sum-missing"
          onClick={() => onQuarter(summary.missing[i].quarter)}
        >
          {text}
        </button>
      ))}
      {summary.warnings > 0 && (
        <button type="button" className="autonomo-sum-item autonomo-sum-warn" onClick={onChecks}>
          {t('app.autonomo.summary.warnings', { n: summary.warnings })}
        </button>
      )}
      {missing.length === 0 && summary.warnings === 0 && (
        <span className="autonomo-sum-item autonomo-sum-ok">
          {t(summary.empty ? 'app.autonomo.summary.start' : 'app.autonomo.summary.ready')}
        </span>
      )}
    </aside>
  );
}
