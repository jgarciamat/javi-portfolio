import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { PLAY_SUBSCRIPTIONS_URL } from '@core/billing/playStore';
import { Modal } from '@shared/components/Modal';
import { errorMessage } from '@shared/utils/errors';
import { isNativeApp } from '@shared/utils/platform';
import type { BillingOverview } from '../domain/types';
import './css/Billing.css';

interface TermsUpdateModalProps {
  subscription: BillingOverview['subscription'];
  /** Reloads the plan once the new terms are accepted (the dialog then goes away). */
  onAccepted: () => Promise<unknown>;
  openPortal: () => Promise<void>;
}

/**
 * The terms of sale changed since the user accepted them: they accept the current version
 * (the server keeps the date and the version) or, if they disagree, stop the renewal.
 */
export function TermsUpdateModal({ subscription, onAccepted, openPortal }: TermsUpdateModalProps) {
  const { t } = useI18n();
  const { billingApi } = useApi();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      await billingApi.acceptTerms();
      await onAccepted();
    } catch (e) {
      setError(errorMessage(e, t('terms.update.error')));
      setBusy(false);
    }
  };
  const portal = () =>
    openPortal().catch((e: unknown) => setError(errorMessage(e, t('terms.update.error'))));

  return (
    <Modal
      label={t('terms.update.title')}
      // It cannot be dismissed; reloading the plan is all that "closing" could ever do.
      onClose={onAccepted}
      dismissible={false}
      overlayClassName="upgrade-overlay"
      className="upgrade-modal"
    >
      <h2 className="upgrade-title">{t('terms.update.title')}</h2>
      <p className="upgrade-reason">{t('terms.update.body')}</p>
      <label className="plan-terms">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          disabled={busy}
        />
        <span>
          {t('billing.acceptTerms')} (
          <a href="/terms" target="_blank" rel="noopener">
            {t('billing.readTerms')}
          </a>
          )
        </span>
      </label>
      <div className="button-row">
        <button className="btn-primary" disabled={!checked || busy} onClick={() => void accept()}>
          {t('terms.update.accept')}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      <p className="plan-note">{t('terms.update.disagree')}</p>
      {subscription.canManage && !isNativeApp() && (
        <div className="button-row">
          <button className="btn-secondary" onClick={() => void portal()}>
            {t('billing.manage')}
          </button>
        </div>
      )}
      {subscription.source === 'google' && !subscription.lifetime && (
        <div className="button-row">
          <a
            className="btn-secondary"
            href={PLAY_SUBSCRIPTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('billing.manageGoogle')}
          </a>
        </div>
      )}
    </Modal>
  );
}
