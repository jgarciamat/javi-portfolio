import { useId } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import '../css/GuidedTour.css';

interface TourOfferProps {
  /** `true`: start the tour; `false`: not now. Either way the notice is not shown again. */
  onAnswer: (accepted: boolean) => void;
}

/** A discreet, non-blocking notice: the tour was renewed. Offered once to whoever had turned it off. */
export function TourOffer({ onAnswer }: TourOfferProps) {
  const { t } = useI18n();
  const titleId = useId();
  return (
    <section className="tour-offer" aria-labelledby={titleId}>
      <h2 id={titleId} className="tour-offer-title">
        {t('app.tour.offer.title')}
      </h2>
      <p className="tour-offer-body">{t('app.tour.offer.body')}</p>
      <div className="tour-offer-actions">
        <button type="button" className="btn-secondary tour-btn" onClick={() => onAnswer(false)}>
          {t('app.tour.offer.dismiss')}
        </button>
        <button type="button" className="btn-primary tour-btn" onClick={() => onAnswer(true)}>
          {t('app.tour.offer.view')}
        </button>
      </div>
    </section>
  );
}
