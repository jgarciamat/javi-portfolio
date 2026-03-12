import '../css/TransactionViewSelector.css';
import { useI18n } from '@core/i18n/I18nContext';
import type { TransactionViewMode } from '@modules/finances/application/hooks/useTransactionView';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TransactionViewSelectorProps {
    mode: TransactionViewMode;
    onModeChange: (mode: TransactionViewMode) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODES: { value: TransactionViewMode; icon: string; labelKey: string }[] = [
    { value: 'day', icon: '☀️', labelKey: 'app.transactions.view.day' },
    { value: 'week', icon: '📅', labelKey: 'app.transactions.view.week' },
    { value: 'calendar', icon: '🗓️', labelKey: 'app.transactions.view.calendar' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionViewSelector({ mode, onModeChange }: TransactionViewSelectorProps) {
    const { t } = useI18n();

    return (
        <div
            className="tx-view-selector"
            role="group"
            aria-label={t('app.transactions.view.day')}
            onClick={(e) => e.stopPropagation()}
        >
            {MODES.map(({ value, icon, labelKey }) => (
                <button
                    key={value}
                    type="button"
                    className={`tx-view-selector__btn${mode === value ? ' tx-view-selector__btn--active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onModeChange(value); }}
                    aria-pressed={mode === value}
                    title={t(labelKey)}
                >
                    <span className="tx-view-selector__icon" aria-hidden="true">{icon}</span>
                    <span className="tx-view-selector__label">{t(labelKey)}</span>
                </button>
            ))}
        </div>
    );
}
