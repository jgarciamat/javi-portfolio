import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import '@modules/billing/ui/css/Billing.css';

/** What a free account sees when it opens a Premium chapter: never its text, a way to upgrade. */
export function LearnLocked({ onUpgrade }: { onUpgrade: () => void }) {
  const { t } = useI18n();
  return (
    <div className="inv-locked">
      <section className="inv-locked-panel" aria-label={t('app.invest.locked.title')}>
        <Icon name="lock" size={28} />
        <span className="premium-chip">Premium</span>
        <h3>{t('app.invest.locked.title')}</h3>
        <p>{t('app.invest.locked.text')}</p>
        <button type="button" className="btn-primary" onClick={onUpgrade}>
          {t('app.invest.locked.cta')}
        </button>
      </section>
    </div>
  );
}
