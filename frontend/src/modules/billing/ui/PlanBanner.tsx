import { useI18n } from '@core/i18n/I18nContext';
import { useOptionalPlan, type BillingNotice } from '../application/PlanContext';
import type { BillingOverview } from '../domain/types';
import './css/Billing.css';

const TRIAL_REMINDER_DAYS = 3;

function noticeKey(notice: BillingNotice, overview: BillingOverview | null): string {
  if (notice === 'cancel') return 'billing.notice.cancel';
  if (notice === 'portal') return 'billing.notice.portal';
  const paid = overview?.plan === 'premium' && overview.subscription.source !== 'trial';
  return paid ? 'billing.notice.success' : 'billing.notice.processing';
}

/** Result of a payment, or a reminder that the trial is about to end. */
export function PlanBanner({ onOpenPlan }: { onOpenPlan: () => void }) {
  const { t } = useI18n();
  const plan = useOptionalPlan();
  if (!plan) return null;
  const { notice, dismissNotice, overview } = plan;

  if (notice) {
    return (
      <div className={`plan-banner plan-banner--${notice}`} role="status">
        <span>{t(noticeKey(notice, overview))}</span>
        <button className="plan-banner-close" onClick={dismissNotice} aria-label="OK">
          ✕
        </button>
      </div>
    );
  }

  const days = overview?.trialDaysLeft ?? 0;
  const trialEnding =
    overview?.subscription.source === 'trial' && days > 0 && days <= TRIAL_REMINDER_DAYS;
  if (!trialEnding) return null;
  return (
    <div className="plan-banner" role="status">
      <span>{t('billing.trialEnding', { days })}</span>
      <button className="btn-secondary" onClick={onOpenPlan}>
        {t('billing.seePlans')}
      </button>
    </div>
  );
}
