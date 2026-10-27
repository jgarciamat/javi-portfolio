import { useMemo } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { todayDateOnly } from '@shared/utils/format';
import type { Transaction } from '@modules/finances/domain/types';
import { monthCharges } from '@modules/finances/domain/monthCharges';
import { useFinances } from '../../application/FinancesContext';
import '../css/Sections.css';
import '../css/MonthCharges.css';

/**
 * «Recibos y cargos de este mes»: what the automatic operations charge in the month, apart from
 * the movements. The charged ones and those still to come (with their day), the total of the
 * month and what is pending. Without automatic expenses in the month it is not shown.
 */
export function MonthCharges({ onEdit }: { onEdit: (tx: Transaction) => void }) {
  const { t, tCategory } = useI18n();
  const { money, dayMonth } = useFormat();
  const f = useFinances();
  const charges = useMemo(() => monthCharges(f.transactions, todayDateOnly()), [f.transactions]);
  if (charges.items.length === 0) return null;
  const title = t(f.isCurrentPeriod ? 'app.charges.title' : 'app.charges.titleOther');

  return (
    <section className="card month-charges" aria-label={title}>
      <h2 className="section-title">
        <Icon name="repeat" /> {title}
      </h2>
      <p className="section-hint">{t('app.charges.hint')}</p>
      <dl className="month-charges-facts">
        <div>
          <dt>{t('app.charges.total')}</dt>
          <dd>{money(charges.total)}</dd>
        </div>
        <div>
          <dt>{t('app.charges.pending')}</dt>
          <dd>
            {money(charges.pendingTotal)}
            {charges.pendingCount > 0 && (
              <small>
                {' '}
                ·{' '}
                {charges.pendingCount === 1
                  ? t('app.charges.pendingOne')
                  : t('app.charges.pendingMany', { count: charges.pendingCount })}
              </small>
            )}
          </dd>
        </div>
      </dl>
      <ul className="entity-list" aria-label={t('app.charges.list')}>
        {charges.items.map(({ tx, pending }) => (
          <li key={tx.id}>
            <button
              type="button"
              className="entity-item entity-item--clickable"
              onClick={() => onEdit(tx)}
            >
              <span className="entity-icon">{tx.categoryIcon ?? '•'}</span>
              <span className="entity-main">
                <span className="entity-name">{tx.description}</span>
                <span className="entity-sub">
                  {dayMonth(tx.date)} · {tCategory(tx.category)}
                </span>
              </span>
              <span className="month-charges-amount">
                <span className="entity-amount">{money(tx.amount)}</span>
                <span className={`pill ${pending ? 'pill--due' : 'pill--ok'}`}>
                  {t(pending ? 'app.charges.status.pending' : 'app.charges.status.done')}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {charges.pendingCount > 0 && <p className="section-hint">{t('app.charges.pendingNote')}</p>}
    </section>
  );
}
