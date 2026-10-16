import { useEffect, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import {
  finishReview,
  recordOpen,
  requestStoreReview,
  shouldAskForReview,
  snoozeReview,
  storeListingUrl,
} from '@core/review/review';
import { Icon } from '@shared/components/Icon';
import '../css/Sections.css';

type Step = 'ask' | 'thanks' | 'feedback';

/**
 * "Are you enjoying the app?" after real use: yes opens the store review (Android app) or
 * thanks and points to inviting friends; no offers to write what is missing.
 */
export function RatePrompt({ movements, onInvite }: { movements: number; onInvite: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step | null>(null);

  useEffect(() => {
    const now = new Date();
    recordOpen(now);
    if (shouldAskForReview(movements, now)) setStep('ask');
  }, [movements]);

  if (!step) return null;
  const close = () => {
    snoozeReview(new Date());
    setStep(null);
  };

  return (
    <div className="card rate-prompt" role="region" aria-label={t('app.rate.title')}>
      {step === 'ask' && (
        <>
          <h2 className="section-title">
            <Icon name="star" /> {t('app.rate.title')}
          </h2>
          <div className="button-row">
            <button
              className="btn-primary"
              onClick={async () => {
                finishReview();
                setStep((await requestStoreReview()) ? null : 'thanks');
              }}
            >
              {t('app.rate.yes')}
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                finishReview();
                setStep('feedback');
              }}
            >
              {t('app.rate.no')}
            </button>
            <button className="btn-secondary" onClick={close}>
              {t('app.rate.later')}
            </button>
          </div>
        </>
      )}
      {step === 'thanks' && (
        <>
          <p>{t('app.rate.thanks')}</p>
          <div className="button-row">
            <a
              className="btn-primary"
              href={storeListingUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('app.rate.store')}
            </a>
            <button className="btn-secondary" onClick={onInvite}>
              {t('app.rate.invite')}
            </button>
            <button className="btn-secondary" onClick={() => setStep(null)}>
              {t('app.common.close')}
            </button>
          </div>
        </>
      )}
      {step === 'feedback' && (
        <>
          <p>{t('app.rate.feedback')}</p>
          <div className="button-row">
            <a
              className="btn-secondary"
              href="mailto:moneymanager@outlook.es?subject=Finanverso%3A%20sugerencias"
              onClick={() => setStep(null)}
            >
              {t('app.rate.write')}
            </a>
            <button className="btn-secondary" onClick={() => setStep(null)}>
              {t('app.common.close')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
