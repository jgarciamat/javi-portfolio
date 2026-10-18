import { useI18n } from '@core/i18n/I18nContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import type { LimitedResource } from '@modules/billing/domain/types';
import { PremiumGate } from '@modules/billing/ui/PremiumGate';
import { freeDraftQuarters } from '@modules/finances/domain/autonomoQuarters';

/** The limit of the plan for a resource (null = unlimited) and whether it is used up. */
export function usageLimit(
  plan: ReturnType<typeof useOptionalPlan>,
  resource: LimitedResource
): { limit: number | null | undefined; locked: boolean } {
  const limit = plan?.overview?.limits.resources[resource];
  const used = plan?.overview?.usage[resource] ?? 0;
  return { limit, locked: limit !== null && limit !== undefined && used >= limit };
}

/**
 * Whether the self-employed draft of a quarter can be prepared. The free plan prepares the current
 * quarter and the one just ended while it can be filed (`otherQuarter` is any other), one draft
 * each: what counts is the use of that quarter.
 */
export function quarterDraftAccess(
  plan: ReturnType<typeof useOptionalPlan>,
  year: number,
  quarter: number
): { limit: number | null | undefined; locked: boolean; otherQuarter: boolean } {
  const { limit } = usageLimit(plan, 'autonomoDrafts');
  const same = (q: { year: number; quarter: number }) => q.year === year && q.quarter === quarter;
  const quarterUse = plan?.overview?.autonomoQuarters.find(same);
  const used = quarterUse?.used ?? plan?.overview?.usage.autonomoDrafts ?? 0;
  return {
    limit,
    locked: limit !== null && limit !== undefined && used >= limit,
    otherQuarter: !!plan?.isFree && !freeDraftQuarters(new Date()).some(same),
  };
}

/** The free uses are spent: say so and open the plans. */
export function UsedFreeGate({
  text,
  resource,
  limit,
}: {
  text: string;
  resource: LimitedResource;
  limit: number;
}) {
  const { t } = useI18n();
  const plan = useOptionalPlan();
  return (
    <PremiumGate>
      <p className="section-hint">{text}</p>
      <button
        className="btn-primary"
        onClick={() => plan?.openUpgrade({ kind: 'limit', resource, limit })}
      >
        {t('app.autonomo.goPremium')}
      </button>
    </PremiumGate>
  );
}
