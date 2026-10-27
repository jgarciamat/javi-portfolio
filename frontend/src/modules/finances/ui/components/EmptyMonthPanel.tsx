import type { ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import type { ImportSource } from './ImportSources';

/** One way to start: a big button with a line under it. */
export function EmptyMonthOption({
  icon,
  label,
  hint,
  onClick,
  tour,
  busy = false,
}: {
  icon: string;
  label: string;
  hint: string;
  onClick: () => void;
  tour?: string;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      className="empty-month-option"
      onClick={onClick}
      data-tour={tour}
      disabled={busy}
      aria-busy={busy}
    >
      <Icon name={icon} size={22} />
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
    </button>
  );
}

/**
 * A month without movements: what to do first, instead of empty totals and buttons that do
 * nothing yet. `children`: «try it with sample data», only offered to an account still empty.
 */
export function EmptyMonthPanel({
  onImport,
  onAddExpense,
  children,
}: {
  onImport?: (source?: ImportSource) => void;
  onAddExpense: () => void;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="card empty-month" aria-labelledby="empty-month-title">
      <h2 id="empty-month-title" className="section-title">
        <Icon name="rocket" /> {t('app.emptyMonth.title')}
      </h2>
      <p className="section-hint">{t('app.emptyMonth.body')}</p>
      <div className="empty-month-options" data-tour="month-actions">
        {onImport && (
          <>
            <EmptyMonthOption
              icon="upload"
              label={t('app.emptyMonth.import')}
              hint={t('app.emptyMonth.importHint')}
              onClick={() => onImport('file')}
              tour="import"
            />
            <EmptyMonthOption
              icon="clipboard"
              label={t('app.emptyMonth.paste')}
              hint={t('app.emptyMonth.pasteHint')}
              onClick={() => onImport('paste')}
            />
          </>
        )}
        {children}
        <EmptyMonthOption
          icon="plus"
          label={t('app.emptyMonth.add')}
          hint={t('app.emptyMonth.addHint')}
          onClick={onAddExpense}
        />
      </div>
    </section>
  );
}
