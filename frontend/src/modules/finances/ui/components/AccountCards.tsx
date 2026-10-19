import type { CSSProperties } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import type { Account } from '@modules/finances/domain/types';
import '../css/SummaryCards.css';

interface AccountCardsProps {
  /** The accounts in use (archived ones are not shown). */
  accounts: Account[];
  /** The account whose movements are the only ones listed, if any. */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Opens the new-movement form with this account chosen. */
  onAdd: (id: string) => void;
  onTransfer: () => void;
}

/** With two or more accounts: one card each with its balance, to filter by it or to add a movement to it. */
export function AccountCards({
  accounts,
  selectedId,
  onSelect,
  onAdd,
  onTransfer,
}: AccountCardsProps) {
  const { t } = useI18n();
  const { money } = useFormat();
  const selected = accounts.find((a) => a.id === selectedId);

  return (
    <section aria-label={t('app.accountCards.ariaLabel')} className="account-cards-section">
      <div className="account-cards">
        {accounts.map((a) => (
          <div
            key={a.id}
            className={`account-card${a.id === selectedId ? ' account-card--selected' : ''}`}
            style={{ '--accent': a.color || 'var(--accent-400)' } as CSSProperties}
          >
            <button
              type="button"
              className="account-card-main"
              aria-pressed={a.id === selectedId}
              onClick={() => onSelect(a.id === selectedId ? null : a.id)}
            >
              <span className="account-card-name">
                <span aria-hidden="true">{a.icon}</span> {a.name}
              </span>
              <span className={`account-card-balance${a.balance < 0 ? ' amount-neg' : ''}`}>
                {money(a.balance)}
              </span>
            </button>
            <div className="account-card-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onAdd(a.id)}
                aria-label={`${t('app.accountCards.add')}: ${a.name}`}
              >
                + {t('app.accountCards.add')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onTransfer}
                aria-label={`${t('app.accountCards.transfer')}: ${a.name}`}
              >
                {t('app.accountCards.transfer')}
              </button>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <p className="account-filter" role="status">
          {t('app.accountCards.filtering', { name: selected.name })}{' '}
          <button type="button" className="link-button" onClick={() => onSelect(null)}>
            {t('app.accountCards.clear')}
          </button>
        </p>
      )}
    </section>
  );
}
