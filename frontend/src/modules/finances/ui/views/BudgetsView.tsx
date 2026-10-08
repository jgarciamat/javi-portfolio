import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { useAction } from '@shared/hooks/useAction';
import { useResource } from '@shared/hooks/useResource';
import { parseDecimal } from '@shared/utils/numbers';
import type { CategoryBudget } from '@modules/finances/domain/types';
import { useFinances } from '../../application/FinancesContext';
import '../css/Sections.css';

/** Monthly spending limit per category, with this month's spending next to it. */
export function BudgetsView() {
  const { budgetApi } = useApi();
  const { t, tCategory } = useI18n();
  const { money, monthLabel } = useFormat();
  const { categories, budgets: lines, year, month, refresh } = useFinances();
  const budgets = useResource(() => budgetApi.getAll(), [budgetApi], {
    initial: [] as CategoryBudget[],
  });
  const action = useAction();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const byCategory = new Map(budgets.data.map((b) => [b.categoryId, b]));
  const spent = new Map(lines.map((l) => [l.categoryId, l]));
  const totalLimit = budgets.data.reduce((s, b) => s + b.amount, 0);

  /** Saves the edited limit; an empty or zero limit removes the budget. */
  const save = async (categoryId: string) => {
    const draft = drafts[categoryId];
    if (draft === undefined) return;
    const amount = parseDecimal(draft);
    const existing = byCategory.get(categoryId);
    const saved = await action.run(async () => {
      if (Number.isFinite(amount) && amount > 0) await budgetApi.set(categoryId, amount);
      else if (existing) await budgetApi.delete(existing.id);
      await Promise.all([budgets.reload(), refresh({ invalidate: true })]);
    });
    if (saved) {
      setDrafts(({ [categoryId]: _saved, ...rest }) => rest);
    }
  };

  return (
    <div className="section-view">
      <div className="card">
        <div className="section-header">
          <h2 className="section-title">🎯 {t('app.budgets.title')}</h2>
          <span className="section-total">{money(totalLimit)}</span>
        </div>
        <p className="section-hint">{t('app.budgets.hint', { month: monthLabel(year, month) })}</p>
        {(action.error ?? budgets.error) && (
          <p className="form-error">{action.error ?? budgets.error}</p>
        )}
        <ul className="entity-list">
          {categories.map((c) => {
            const budget = byCategory.get(c.id);
            const line = spent.get(c.id);
            const draft = drafts[c.id];
            const name = tCategory(c.name);
            return (
              <li key={c.id} className="entity-item">
                <span className="entity-icon" style={{ background: `${c.color}22` }}>
                  {c.icon}
                </span>
                <div className="entity-main">
                  <span className="entity-name">{name}</span>
                  {line && (
                    <span className={`entity-sub progress-item-value--${line.level}`}>
                      {t('app.budgets.spentOf', {
                        spent: money(line.spent),
                        limit: money(line.limit),
                      })}
                    </span>
                  )}
                </div>
                <input
                  className="tx-input budget-input"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  placeholder={t('app.budgets.noLimit')}
                  value={draft ?? (budget ? String(budget.amount) : '')}
                  aria-label={`${t('app.budgets.limitFor')} ${name}`}
                  onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void save(c.id);
                  }}
                />
                {draft !== undefined && (
                  <button
                    className="btn-primary btn-small"
                    onClick={() => save(c.id)}
                    disabled={action.pending}
                  >
                    {t('app.common.save')}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
