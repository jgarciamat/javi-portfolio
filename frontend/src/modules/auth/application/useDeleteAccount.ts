import { useCallback, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useAuth } from '@shared/hooks/useAuth';
import { errorMessage } from '@shared/utils/errors';

/** Deletes the account and ends the session (the tokens no longer exist in the API). */
export function useDeleteAccount() {
  const { authApi } = useApi();
  const { endSession } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await authApi.deleteAccount();
      endSession();
    } catch (err) {
      setError(errorMessage(err, t('app.profile.deleteAccount.error')));
      setLoading(false);
    }
  }, [authApi, endSession, t]);

  return { loading, error, handleDelete };
}
