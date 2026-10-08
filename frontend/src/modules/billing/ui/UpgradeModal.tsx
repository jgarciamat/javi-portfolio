import { useI18n } from '@core/i18n/I18nContext';
import { Modal } from '@shared/components/Modal';
import { usePlan } from '../application/PlanContext';
import type { UpgradeReason } from '../domain/types';
import { PlanOptions } from './PlanOptions';
import { FEATURE_KEYS, PREMIUM_BENEFITS, RESOURCE_KEYS } from './pricing';
import './css/Billing.css';

function ReasonText({ reason }: { reason: UpgradeReason }) {
  const { t } = useI18n();
  if (reason.kind === 'limit') {
    return (
      <p className="upgrade-reason">
        {t('billing.reason.limit', {
          limit: reason.limit,
          resource: t(RESOURCE_KEYS[reason.resource]),
        })}
      </p>
    );
  }
  if (reason.kind === 'feature') {
    return (
      <p className="upgrade-reason">
        {t('billing.reason.feature', { feature: t(FEATURE_KEYS[reason.feature]) })}
      </p>
    );
  }
  return null;
}

/** Paywall: why, what Premium includes and how to pay. */
export function UpgradeModal({ reason }: { reason: UpgradeReason }) {
  const { t } = useI18n();
  const { overview, closeUpgrade, checkout } = usePlan();

  const subscribed =
    !!overview && overview.plan === 'premium' && overview.subscription.source !== 'trial';

  return (
    <Modal
      label={t('billing.upgradeTitle')}
      onClose={closeUpgrade}
      overlayClassName="upgrade-overlay"
      className="upgrade-modal"
    >
      <button className="upgrade-close" onClick={closeUpgrade} aria-label={t('app.menu.close')}>
        ✕
      </button>
      <div className="upgrade-icon" aria-hidden="true">
        ⭐
      </div>
      <h2 className="upgrade-title">{t('billing.upgradeTitle')}</h2>
      <ReasonText reason={reason} />
      <ul className="upgrade-benefits">
        {PREMIUM_BENEFITS.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
      {overview ? (
        <PlanOptions
          catalog={overview.catalog}
          onChoose={checkout}
          disabled={subscribed}
          trialDaysLeft={overview.trialDaysLeft}
        />
      ) : (
        <p className="plan-note">{t('app.common.loading')}</p>
      )}
    </Modal>
  );
}
