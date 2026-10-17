import { useCallback, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { errorCode } from '@core/api/http';
import type { DeleteAccountProof } from '@core/api/authApi';
import { useI18n } from '@core/i18n/I18nContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import type { BillingOverview } from '@modules/billing/domain/types';
import { useAuth } from '@shared/hooks/useAuth';
import { errorMessage } from '@shared/utils/errors';

/** Where Android users cancel a Google Play subscription. */
export const PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

const LIVE_STATUSES = ['active', 'trialing', 'past_due'];

/** A Google Play subscription that will charge again (the API cannot cancel it). */
export function renewsInGooglePlay(overview: BillingOverview | null | undefined): boolean {
  const sub = overview?.subscription;
  return (
    !!sub &&
    sub.source === 'google' &&
    !sub.lifetime &&
    LIVE_STATUSES.includes(sub.status) &&
    !sub.cancelAtPeriodEnd
  );
}

/** Deletes the account and ends the session (the tokens no longer exist in the API). */
export function useDeleteAccount() {
  const { authApi } = useApi();
  const { endSession } = useAuth();
  const { t } = useI18n();
  const plan = useOptionalPlan();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The API also says so, in case the plan shown here is out of date.
  const [playRequired, setPlayRequired] = useState(false);

  const handleDelete = useCallback(
    async (proof: DeleteAccountProof) => {
      setLoading(true);
      setError(null);
      try {
        await authApi.deleteAccount(proof);
        endSession();
      } catch (err) {
        if (errorCode(err) === 'PLAY_SUBSCRIPTION_ACTIVE') setPlayRequired(true);
        else setError(errorMessage(err, t('app.profile.deleteAccount.error')));
        setLoading(false);
      }
    },
    [authApi, endSession, t]
  );

  return {
    loading,
    error,
    playActive: playRequired || renewsInGooglePlay(plan?.overview),
    handleDelete,
  };
}
