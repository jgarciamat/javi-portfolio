import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Modal } from '@shared/components/Modal';
import { intlLocale, parseDateOnly } from '@shared/utils/format';
import type { Transaction, TransactionType } from '@modules/finances/domain/types';
import { TYPE_COLORS, totalsByType } from '@modules/finances/domain/transactionTypes';
import { MovementItem } from './TransactionWeekView';
import '../css/TransactionViews.css';

export interface CalendarDayModalProps {
  /** YYYY-MM-DD */
  dayKey: string;
  items: Transaction[];
  onClose: () => void;
}

const ROWS: { key: 'income' | 'expenses' | 'saving'; type: TransactionType; sign: string }[] = [
  { key: 'income', type: 'INCOME', sign: '+' },
  { key: 'expenses', type: 'EXPENSE', sign: '−' },
  { key: 'saving', type: 'SAVING', sign: '' },
];

/** Movements of one calendar day with the day's totals. */
export function CalendarDayModal({ dayKey, items, onClose }: CalendarDayModalProps) {
  const { t, locale } = useI18n();
  const { money } = useFormat();
  const dateLabel = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parseDateOnly(dayKey));
  const totals = totalsByType(items);
  const positive = totals.balance >= 0;

  return (
    <Modal
      label={dateLabel}
      onClose={onClose}
      overlayClassName="cal-modal-overlay"
      className="cal-modal"
    >
      <div className="cal-modal-header">
        <span className="cal-modal-title">{dateLabel}</span>
        <button
          className="cal-modal-close"
          onClick={onClose}
          aria-label={t('app.transactions.calendar.popup.close')}
        >
          ✕
        </button>
      </div>

      <div className="cal-modal-summary">
        {ROWS.filter(({ key }) => totals[key] > 0).map(({ key, type, sign }) => (
          <div key={key} className="cal-modal-summary-row">
            <span className="cal-modal-summary-label">
              {t(`app.transactions.calendar.popup.${key}`)}
            </span>
            <span className="cal-modal-summary-amount" style={{ color: TYPE_COLORS[type] }}>
              {sign}
              {money(totals[key])}
            </span>
          </div>
        ))}
        <div className="cal-modal-summary-row cal-modal-summary-row--balance">
          <span className="cal-modal-summary-label">
            {t('app.transactions.calendar.popup.balance')}
          </span>
          <span
            className="cal-modal-summary-amount cal-modal-summary-amount--balance"
            style={{ color: TYPE_COLORS[positive ? 'INCOME' : 'EXPENSE'] }}
          >
            {positive ? '+' : '−'}
            {money(Math.abs(totals.balance))}
          </span>
        </div>
      </div>

      <div className="cal-modal-list">
        {items.map((tx) => (
          <MovementItem key={tx.id} tx={tx} prefix="cal-modal" />
        ))}
      </div>
    </Modal>
  );
}
