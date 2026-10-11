import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { useAction } from '@shared/hooks/useAction';
import { useResource } from '@shared/hooks/useResource';
import type { VatRate } from '@modules/finances/domain/types';
import { useFinances } from '../../application/FinancesContext';
import '../css/Sections.css';
import { Icon } from '@shared/components/Icon';

const RATES: VatRate[] = [21, 10, 4, 0];
const NONE = 'none';

/** Self-employed: which categories are professional (and their VAT) and the quarterly estimate. */
export function SelfEmployedCard() {
  const { businessApi } = useApi();
  const { t, tCategory } = useI18n();
  const { money } = useFormat();
  const { categories, year: viewedYear } = useFinances();
  const action = useAction();
  const [year, setYear] = useState(viewedYear);
  const { data: marked, reload: reloadMarked } = useResource(
    () => businessApi.categories(),
    [businessApi],
    { initial: [] }
  );
  const { data: tax, reload: reloadTax } = useResource(
    () => businessApi.tax(year),
    [businessApi, year]
  );
  const rateOf = (id: string): string =>
    String(marked.find((m) => m.categoryId === id)?.vatRate ?? NONE);

  const change = (categoryId: string, value: string) =>
    action.run(async () => {
      if (value === NONE) await businessApi.removeCategory(categoryId);
      else await businessApi.setCategory(categoryId, Number(value) as VatRate);
      await Promise.all([reloadMarked(), reloadTax()]);
    });

  return (
    <div className="card">
      <h2 className="section-title">
        <Icon name="receipt" /> {t('app.tax.title')}
      </h2>
      <p className="section-hint">{t('app.tax.hint')}</p>
      {action.error && <p className="form-error">{action.error}</p>}
      <div className="form-grid">
        {categories.map((c) => (
          <label key={c.id} className="field">
            <span className="field-label">
              {c.icon} {tCategory(c.name)}
            </span>
            <select
              className="tx-input"
              value={rateOf(c.id)}
              onChange={(e) => void change(c.id, e.target.value)}
            >
              <option value={NONE}>{t('app.tax.personal')}</option>
              {RATES.map((r) => (
                <option key={r} value={r}>
                  {t('app.tax.professional', { rate: r })}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {tax && marked.length > 0 && (
        <>
          <div className="section-header">
            <h3>{t('app.tax.estimate')}</h3>
            <select
              className="tx-input select-compact"
              value={year}
              aria-label={t('app.tax.year')}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[viewedYear, viewedYear - 1, viewedYear - 2].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th />
                  {tax.quarters.map((q) => (
                    <th key={q.quarter}>T{q.quarter}</th>
                  ))}
                  <th>{t('app.tax.total')}</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['incomeBase', 'app.tax.income'],
                    ['expenseBase', 'app.tax.expenses'],
                    ['netIncome', 'app.tax.net'],
                    ['vatDue', 'app.tax.vat'],
                    ['irpfAdvance', 'app.tax.irpf'],
                  ] as const
                ).map(([key, label]) => (
                  <tr key={key}>
                    <td>{t(label)}</td>
                    {tax.quarters.map((q) => (
                      <td key={q.quarter}>{money(q[key])}</td>
                    ))}
                    <td>
                      <strong>{money(tax.totals[key])}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="plan-note">{t('app.tax.disclaimer')}</p>
        </>
      )}
    </div>
  );
}
