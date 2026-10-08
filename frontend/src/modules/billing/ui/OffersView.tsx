import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useResource } from '@shared/hooks/useResource';
import './css/Billing.css';

/** Partner offers (affiliate links), clearly labelled as sponsored. */
export function OffersView() {
  const { t, locale } = useI18n();
  const { offersApi } = useApi();
  const { data, loading, error } = useResource(() => offersApi.list(), [offersApi], {
    initial: { enabled: true, offers: [] },
  });
  const { enabled, offers } = data;

  const text = (value: { es: string; en: string }) => (locale === 'en' ? value.en : value.es);

  return (
    <div className="section-view">
      <div className="card">
        <h2 className="section-title">🎁 {t('offers.title')}</h2>
        <p className="offers-disclosure">{t('offers.disclosure')}</p>
        {error && <p className="form-error">{error}</p>}
        {!enabled && <p className="section-hint">{t('offers.disabled')}</p>}
        {!loading && !error && enabled && offers.length === 0 && (
          <p className="section-hint">{t('offers.empty')}</p>
        )}
        {loading && <p className="section-hint">{t('app.common.loading')}</p>}
      </div>
      {offers.map((offer) => (
        <div key={offer.id} className="card offer-card">
          <div className="offer-head">
            <span className="offer-icon" aria-hidden="true">
              {offer.icon}
            </span>
            <div>
              <h3 className="offer-title">{text(offer.title)}</h3>
              <small className="offer-partner">
                {offer.name} · {t(`offers.category.${offer.category}`)}
              </small>
            </div>
            <span className="offer-sponsored">{t('offers.sponsored')}</span>
          </div>
          <p>{text(offer.description)}</p>
          {offer.highlight && <p className="offer-highlight">✨ {text(offer.highlight)}</p>}
          <a
            className="btn-primary offer-cta"
            href={offer.url}
            target="_blank"
            rel="sponsored noopener noreferrer"
            onClick={() => {
              offersApi.click(offer.id).catch(() => undefined);
            }}
          >
            {t('offers.cta')} ↗
          </a>
        </div>
      ))}
    </div>
  );
}
