import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { usePlan } from '../application/PlanContext';
import type { BillingOverview, LimitedResource } from '../domain/types';
import { PlanOptions } from './PlanOptions';
import { PREMIUM_BENEFITS, RESOURCE_KEYS } from './pricing';
import './css/Billing.css';
import { errorMessage } from '@shared/utils/errors';

const RESOURCES: LimitedResource[] = [
  'accounts',
  'budgets',
  'goals',
  'recurringRules',
  'customAlerts',
];

function StatusLine({ overview }: { overview: BillingOverview }) {
  const { t } = useI18n();
  const { date: formatDate } = useFormat();
  const { subscription: sub } = overview;
  const date = (iso: string | null) => (iso ? formatDate(iso) : '');

  if (sub.lifetime) return <p>{t('billing.status.lifetime')}</p>;
  if (sub.source === 'stripe' && sub.status === 'past_due') {
    return <p className="form-error">{t('billing.status.pastDue')}</p>;
  }
  if (sub.source === 'stripe' && overview.plan === 'premium') {
    return (
      <p>
        {sub.cancelAtPeriodEnd
          ? t('billing.status.endsOn', { date: date(sub.currentPeriodEnd) })
          : t('billing.status.renewsOn', { date: date(sub.currentPeriodEnd) })}
      </p>
    );
  }
  if (overview.trialDaysLeft > 0) {
    return <p>{t('billing.status.trial', { days: overview.trialDaysLeft })}</p>;
  }
  return <p>{t('billing.status.free')}</p>;
}

function UsageCard({ overview }: { overview: BillingOverview }) {
  const { t } = useI18n();
  const isPremium = overview.plan === 'premium';
  return (
    <div className="card">
      <h2 className="section-title">📊 {t('billing.usage')}</h2>
      <ul className="plan-usage">
        {RESOURCES.map((r) => {
          const max = overview.limits.resources[r];
          const full = max !== null && overview.usage[r] >= max;
          return (
            <li key={r} className={full ? 'plan-usage-full' : undefined}>
              <span>{t(RESOURCE_KEYS[r])}</span>
              <strong>
                {overview.usage[r]} / {max === null ? '∞' : max}
              </strong>
            </li>
          );
        })}
        <li>
          <span>{t('billing.aiAnalyses')}</span>
          <strong>
            {isPremium ? `${overview.ai.used} / ${overview.ai.quota}` : t('billing.premiumOnly')}
          </strong>
        </li>
      </ul>
    </div>
  );
}

/** "Tu plan": status, usage against the limits and the way to upgrade or manage it. */
export function PlanView() {
  const { t } = useI18n();
  const { overview, loading, checkout, openPortal } = usePlan();
  const [error, setError] = useState<string | null>(null);

  if (loading && !overview) return <div className="card">{t('app.common.loading')}</div>;
  if (!overview) return <div className="card form-error">{t('billing.loadError')}</div>;

  const isPremium = overview.plan === 'premium';
  const paying = isPremium && overview.subscription.source !== 'trial';

  const portal = () => openPortal().catch((e: unknown) => setError(errorMessage(e, 'Error')));

  return (
    <div className="section-view">
      <div className="card plan-card">
        <div className="plan-card-head">
          <h2 className="section-title">⭐ {t('billing.yourPlan')}</h2>
          <span className={`plan-badge plan-badge--${overview.plan}`}>
            {isPremium ? t('billing.premium') : t('billing.free')}
          </span>
        </div>
        <StatusLine overview={overview} />
        {error && <p className="form-error">{error}</p>}
        {overview.subscription.canManage && (
          <div className="button-row">
            <button className="btn-secondary" onClick={portal}>
              ⚙️ {t('billing.manage')}
            </button>
          </div>
        )}
      </div>

      <UsageCard overview={overview} />

      {!paying && (
        <div className="card">
          <h2 className="section-title">🚀 {t('billing.upgradeTitle')}</h2>
          <ul className="upgrade-benefits">
            {PREMIUM_BENEFITS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
          <PlanOptions catalog={overview.catalog} onChoose={checkout} />
          {overview.trialDaysLeft > 0 && (
            <p className="plan-note">{t('billing.trialKeeps', { days: overview.trialDaysLeft })}</p>
          )}
          <p className="plan-note">
            <a href="/terms" target="_blank" rel="noopener">
              {t('billing.terms')}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
