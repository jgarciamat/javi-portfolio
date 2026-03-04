import { useState, useCallback } from 'react';
import { openBankingApi, BankInstitution, SyncResult } from '@core/api/premiumApi';

interface UseBankSyncResult {
    institutions: BankInstitution[];
    loadingInstitutions: boolean;
    syncing: boolean;
    syncResult: SyncResult | null;
    error: string | null;
    fetchInstitutions: () => Promise<void>;
    linkAccount: (institutionId: string) => Promise<void>;
    syncTransactions: (accountId: string) => Promise<void>;
    requisitionId: string | null;
    linkUrl: string | null;
    clearResult: () => void;
}

export function useBankSync(): UseBankSyncResult {
    const [institutions, setInstitutions] = useState<BankInstitution[]>([]);
    const [loadingInstitutions, setLoadingInstitutions] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [requisitionId, setRequisitionId] = useState<string | null>(null);
    const [linkUrl, setLinkUrl] = useState<string | null>(null);

    const fetchInstitutions = useCallback(async () => {
        setLoadingInstitutions(true);
        setError(null);
        try {
            const res = await openBankingApi.listInstitutions('ES');
            setInstitutions(res.institutions);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error cargando bancos');
        } finally {
            setLoadingInstitutions(false);
        }
    }, []);

    const linkAccount = useCallback(async (institutionId: string) => {
        setError(null);
        try {
            const redirectUrl = `${window.location.origin}/open-banking/callback`;
            const res = await openBankingApi.linkAccount(institutionId, redirectUrl);
            setRequisitionId(res.requisitionId);
            setLinkUrl(res.link);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error vinculando cuenta');
        }
    }, []);

    const syncTransactions = useCallback(async (accountId: string) => {
        setSyncing(true);
        setError(null);
        try {
            // Default: sync last 30 days
            const now = new Date();
            const from = new Date(now.getFullYear(), now.getMonth(), 1);
            const dateTo = now.toISOString().split('T')[0];
            const dateFrom = from.toISOString().split('T')[0];
            const result = await openBankingApi.syncTransactions(accountId, dateFrom, dateTo);
            setSyncResult(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error sincronizando');
        } finally {
            setSyncing(false);
        }
    }, []);

    const clearResult = useCallback(() => {
        setSyncResult(null);
        setError(null);
        setLinkUrl(null);
        setRequisitionId(null);
    }, []);

    return {
        institutions,
        loadingInstitutions,
        syncing,
        syncResult,
        error,
        fetchInstitutions,
        linkAccount,
        syncTransactions,
        requisitionId,
        linkUrl,
        clearResult,
    };
}
