import type { ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { useOptionalPlan } from '../application/PlanContext';
import type { PremiumFeature } from '../domain/types';
import './css/Billing.css';

/**
 * A Premium section: its content for Premium users, an invitation to upgrade for the rest
 * (also when the plan could not be loaded: Premium content fails closed). `feature` is what
 * the upgrade dialog says is missing.
 */
export function PremiumOnly({
  icon,
  titleKey,
  hintKey,
  feature = 'insights',
  children,
}: {
  icon: string;
  titleKey: string;
  hintKey: string;
  feature?: PremiumFeature;
  children: ReactNode;
}) {
  const plan = useOptionalPlan();
  const { t } = useI18n();
  // Wait for the plan: a free user would otherwise trigger the paywall on load.
  if (plan?.loading && !plan.overview) return <div className="card">{t('app.common.loading')}</div>;
  if (plan && !plan.isPremium) {
    return (
      <div className="card premium-locked">
        <h2 className="section-title">
          <Icon name={icon} /> {t(titleKey)} <span className="premium-chip">Premium</span>
        </h2>
        <p className="section-hint">{t(hintKey)}</p>
        <button
          className="btn-primary"
          onClick={() => plan.openUpgrade({ kind: 'feature', feature })}
        >
          {t('billing.seePlans')}
        </button>
      </div>
    );
  }
  return <>{children}</>;
}
