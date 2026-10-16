import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import '@modules/billing/ui/css/Billing.css';
import { CHAPTERS } from '../domain/content';

/**
 * What a free account sees in "Learn to invest": a blurred, inert preview (only the chapter
 * titles and empty placeholders, never the text of the chapters) with an invitation to upgrade.
 */
export function LearnLocked({ onUpgrade }: { onUpgrade: () => void }) {
  const { t, locale } = useI18n();
  return (
    <div className="inv-locked">
      <div className="inv-locked-preview" aria-hidden="true" inert>
        <ul className="inv-chapters">
          {CHAPTERS.map((c) => (
            <li key={c.id} className="inv-chapter" style={{ ['--cat' as string]: c.color }}>
              <span className="inv-chapter-emoji">{c.emoji}</span>
              <span className="inv-chapter-title">{locale === 'en' ? c.titleEn : c.title}</span>
              <span className="inv-skeleton" />
              <span className="inv-skeleton inv-skeleton--short" />
            </li>
          ))}
        </ul>
      </div>
      <section className="inv-locked-panel" aria-label={t('app.invest.locked.title')}>
        <Icon name="lock" size={28} />
        <span className="premium-chip">Premium</span>
        <h3>{t('app.invest.locked.title')}</h3>
        <p>{t('app.invest.locked.text')}</p>
        <ul>
          {['stocks', 'funds', 'bonds', 'crypto', 'tools', 'markets'].map((k) => (
            <li key={k}>✔ {t(`app.invest.locked.item.${k}`)}</li>
          ))}
        </ul>
        <button type="button" className="btn-primary" onClick={onUpgrade}>
          {t('app.invest.locked.cta')}
        </button>
      </section>
    </div>
  );
}
