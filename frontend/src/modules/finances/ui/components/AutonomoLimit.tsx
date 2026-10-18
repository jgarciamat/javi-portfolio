import { useI18n } from '@core/i18n/I18nContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import type { LimitedResource } from '@modules/billing/domain/types';
import { PremiumGate } from '@modules/billing/ui/PremiumGate';

/** The limit of the plan for a resource (null = unlimited) and whether it is used up. */
export function usageLimit(
  plan: ReturnType<typeof useOptionalPlan>,
  resource: LimitedResource
): { limit: number | null | undefined; locked: boolean } {
  const limit = plan?.overview?.limits.resources[resource];
  const used = plan?.overview?.usage[resource] ?? 0;
  return { limit, locked: limit !== null && limit !== undefined && used >= limit };
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
