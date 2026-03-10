import { useState, useCallback } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import { authApi } from '@core/api/authApi';
import { useI18n } from '@core/i18n/I18nContext';

export interface UseDeleteAccountReturn {
    loading: boolean;
    error: string | null;
    handleDelete: () => Promise<void>;
}

export function useDeleteAccount(): UseDeleteAccountReturn {
    const { logout } = useAuth();
    const { t } = useI18n();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await authApi.deleteAccount();
            logout();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('app.profile.deleteAccount.error'));
            setLoading(false);
        }
    }, [logout, t]);

    return { loading, error, handleDelete };
}
