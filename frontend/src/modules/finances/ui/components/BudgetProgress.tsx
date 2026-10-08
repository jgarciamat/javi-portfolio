import type { BudgetLine } from '@modules/finances/domain/types';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { CollapsiblePanel } from '@shared/components/CollapsiblePanel';
import '../css/Sections.css';

interface BudgetProgressProps {
  budgets: BudgetLine[];
  onManage?: () => void;
}

const LEVEL_COLOR: Record<BudgetLine['level'], string> = {
  ok: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

/** Spending of the month against each category budget. */
export function BudgetProgress({ budgets, onManage }: BudgetProgressProps) {
  const { t, tCategory } = useI18n();
  const { money } = useFormat();
  if (budgets.length === 0) return null;
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <CollapsiblePanel
      title={
        <>
          🎯 {t('app.budgets.monthTitle')} · {money(totalSpent)} / {money(totalLimit)}
        </>
      }
      style={{ marginBottom: '1.25rem' }}
    >
      <ul className="progress-list">
        {budgets.map((b) => (
          <li key={b.categoryId} className="progress-item">
            <div className="progress-item-head">
              <span>{tCategory(b.categoryName)}</span>
              <span className={`progress-item-value progress-item-value--${b.level}`}>
                {money(b.spent)} / {money(b.limit)}
              </span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label={tCategory(b.categoryName)}
              aria-valuenow={Math.round(b.percentage)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, b.percentage)}%`,
                  background: LEVEL_COLOR[b.level],
                }}
              />
            </div>
            <div className="progress-item-foot">
              {b.remaining >= 0
                ? t('app.budgets.left', { amount: money(b.remaining) })
                : t('app.budgets.over', { amount: money(-b.remaining) })}
            </div>
          </li>
        ))}
      </ul>
      {onManage && (
        <button type="button" className="btn-link" onClick={onManage}>
          {t('app.budgets.manage')}
        </button>
      )}
    </CollapsiblePanel>
  );
}
