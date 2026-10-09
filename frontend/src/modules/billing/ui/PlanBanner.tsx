import { useI18n } from '@core/i18n/I18nContext';
import { RESOURCE_KEYS } from './pricing';
import { useOptionalPlan, type BillingNotice } from '../application/PlanContext';
import type { BillingOverview } from '../domain/types';
import './css/Billing.css';

const TRIAL_REMINDER_DAYS = 5;
const RESOURCES = Object.keys(RESOURCE_KEYS) as (keyof typeof RESOURCE_KEYS)[];

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
  // What the free plan would not let them keep creating: they keep it, but cannot add more.
  const free = overview.catalog.limits.free.resources;
  const over = RESOURCES.filter((r) => free[r] !== null && overview.usage[r] > (free[r] as number));
  return (
    <div className="plan-banner" role="status">
      <div>
        <span>{t('billing.trialEnding', { days })}</span>
        <span className="plan-banner-recap">
          {' '}
          {t('billing.trialRecap', { movements: overview.usage.movements })}
          {over.length > 0 &&
            ` ${t('billing.trialOver', {
              items: over
                .map(
                  (r) =>
                    `${overview.usage[r]} ${t(RESOURCE_KEYS[r])} (${t('billing.trialFreeLimit', {
                      limit: free[r] as number,
                    })})`
                )
                .join(', '),
            })}`}
        </span>
      </div>
      <button className="btn-secondary" onClick={onOpenPlan}>
        {t('billing.seePlans')}
      </button>
    </div>
  );
}
