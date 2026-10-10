import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { inviteLink } from '@core/referral';
import { useResource } from '@shared/hooks/useResource';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { errorMessage } from '@shared/utils/errors';
import { isNativeApp } from '@shared/utils/platform';
import { usePlan } from '../application/PlanContext';
import type { BillingOverview, HouseholdPerson, LimitedResource } from '../domain/types';
import { PlanOptions } from './PlanOptions';
import { PREMIUM_BENEFITS, RESOURCE_KEYS } from './pricing';
import './css/Billing.css';

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
          <strong>{`${overview.ai.used} / ${overview.ai.quota}`}</strong>
        </li>
      </ul>
    </div>
  );
}

/** A household member uses the plan of the person who owns the shared data. */
function HouseholdPlanCard({ name }: { name: string }) {
  const { t } = useI18n();
  return (
    <div className="card plan-card">
      <h2 className="section-title">⭐ {t('billing.yourPlan')}</h2>
      <p>{t('billing.householdPlan', { name })}</p>
    </div>
  );
}

/** Plan, status and the subscription portal (where it can be cancelled). */
function PlanCard({ overview }: { overview: BillingOverview }) {
  const { t } = useI18n();
  const { openPortal } = usePlan();
  const [error, setError] = useState<string | null>(null);
  const isPremium = overview.plan === 'premium';
  const portal = () => openPortal().catch((e: unknown) => setError(errorMessage(e, 'Error')));

  return (
    <div className="card plan-card">
      <div className="plan-card-head">
        <h2 className="section-title">⭐ {t('billing.yourPlan')}</h2>
        <span className={`plan-badge plan-badge--${overview.plan}`}>
          {isPremium ? t('billing.premium') : t('billing.free')}
        </span>
      </div>
      <StatusLine overview={overview} />
      {error && <p className="form-error">{error}</p>}
      {/* The provider's portal also sells plans: not inside the store apps. */}
      {overview.subscription.canManage && !isNativeApp() && (
        <>
          <div className="button-row">
            <button className="btn-secondary" onClick={portal}>
              ⚙️ {t('billing.manage')}
            </button>
          </div>
          <p className="plan-note">{t('billing.cancelHint')}</p>
        </>
      )}
    </div>
  );
}

function UpgradeCard({ overview }: { overview: BillingOverview }) {
  const { t } = useI18n();
  const { checkout } = usePlan();
  return (
    <div className="card">
      <h2 className="section-title">🚀 {t('billing.upgradeTitle')}</h2>
      <ul className="upgrade-benefits">
        {PREMIUM_BENEFITS.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
      <PlanOptions
        catalog={overview.catalog}
        onChoose={checkout}
        trialDaysLeft={overview.trialDaysLeft}
      />
      <p className="plan-note">
        <a href="/terms" target="_blank" rel="noopener">
          {t('billing.terms')}
        </a>
      </p>
    </div>
  );
}

/** "Invite a friend": a link that gives both a free month of Premium. */
function InviteCard() {
  const { billingApi } = useApi();
  const { t } = useI18n();
  const { data } = useResource(() => billingApi.referral(), [billingApi]);
  const [copied, setCopied] = useState(false);
  if (!data) return null;
  const link = inviteLink(data.code);
  const share = typeof navigator.share === 'function' ? navigator.share.bind(navigator) : null;
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
  };

  return (
    <div className="card invite-card">
      <h2 className="section-title">🎁 {t('billing.invite.title')}</h2>
      <p className="section-hint">{t('billing.invite.hint', { days: data.rewardDays })}</p>
      <p className="invite-link">
        <code>{link}</code>
      </p>
      <div className="button-row">
        <button className="btn-secondary" onClick={copy}>
          {copied ? t('billing.invite.copied') : t('billing.invite.copy')}
        </button>
        {share && (
          <button
            className="btn-secondary"
            onClick={() =>
              share({ title: 'Money Manager', text: t('billing.invite.shareText'), url: link })
            }
          >
            {t('billing.invite.share')}
          </button>
        )}
      </div>
      <p className="plan-note">
        {t('billing.invite.stats', {
          qualified: data.qualified,
          pending: data.pending,
          earned: data.rewardsEarned,
          missing: data.missing,
        })}
      </p>
    </div>
  );
}

/** "Tu plan": status, usage against the limits and the way to upgrade or manage it. */
export function PlanView() {
  const { t } = useI18n();
  const { overview, loading } = usePlan();

  if (loading && !overview) return <div className="card">{t('app.common.loading')}</div>;
  if (!overview) return <div className="card form-error">{t('billing.loadError')}</div>;

  const paying = overview.plan === 'premium' && overview.subscription.source !== 'trial';
  const member = overview.household.role === 'member';

  return (
    <div className="section-view">
      {member ? (
        <HouseholdPlanCard name={(overview.household.owner as HouseholdPerson).name} />
      ) : (
        <PlanCard overview={overview} />
      )}
      <UsageCard overview={overview} />
      {!member && <InviteCard />}
      {!paying && !member && <UpgradeCard overview={overview} />}
    </div>
  );
}
