import type { BankInstitution, SyncResult } from '@core/api/premiumApi';
import type { BankSyncStep } from '../../application/hooks/useBankSync';

export interface BankSyncProps {
    onSyncComplete?: () => void;
}

export interface BankSyncBodyProps {
    step: Exclude<BankSyncStep, 'idle'>;
    institutions: BankInstitution[];
    loadingInstitutions: boolean;
    linkUrl: string | null;
    syncResult: SyncResult | null;
    onSelectInstitution: (id: string) => void;
    onSync: () => void;
    onClose: () => void;
}
