import type { CSSProperties } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import type { FinancialSummary } from '@modules/finances/domain/types';
import { buildSummaryCards } from '@modules/finances/domain/summaryCards';
import '../css/SummaryCards.css';

interface SummaryCardsProps {
  summary: FinancialSummary;
  carryover: number | null;
}

function Card({
  title,
  icon,
  value,
  sub,
  accent,
  className = '',
}: {
  title: string;
  icon: string;
  value: string;
  sub: string;
  accent: string;
  className?: string;
}) {
  return (
    <div
      className={`summary-card ${className}`.trim()}
      style={{ '--accent': accent } as CSSProperties}
    >
      <div className="summary-card-header">
        <span className="summary-card-title">{title}</span>
        <span className="summary-card-icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className="summary-card-value">{value}</div>
      <div className="summary-card-sub">{sub}</div>
    </div>
  );
}

export function SummaryCards({ summary, carryover }: SummaryCardsProps) {
  const { t } = useI18n();
  const { money, percent } = useFormat();
  const carried = carryover ?? 0;
  const available = carried + summary.balance;

  return (
    <section aria-label={t('app.summary.ariaLabel')} data-tour="summary">
      <div className="summary-grid">
        <Card
          className="summary-card-carryover"
          title={t('app.summary.availableBalance')}
          icon="🏦"
          value={money(available)}
          sub={`${t('app.summary.carryover')}: ${money(carried)}`}
          accent={available >= 0 ? '#6366f1' : '#ef4444'}
        />
        {buildSummaryCards(summary, t, money, (n) => percent(n)).map(({ key, ...card }) => (
          <Card key={key} {...card} />
        ))}
      </div>
    </section>
  );
}
