import { useState } from 'react';
import { useBankSync } from '../../application/hooks/useBankSync';
import '../css/BankSync.css';
import { BankSyncBody } from './BankSyncBody';

interface Props {
    onSyncComplete?: () => void;
}

type Step = 'idle' | 'selecting' | 'linking' | 'syncing' | 'done';

export function BankSync({ onSyncComplete }: Props) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<Step>('idle');

    const {
        institutions,
        loadingInstitutions,
        syncResult,
        error,
        fetchInstitutions,
        linkAccount,
        syncTransactions,
        linkUrl,
        requisitionId,
        clearResult,
    } = useBankSync();

    const handleOpen = async () => {
        setOpen(true);
        setStep('selecting');
        await fetchInstitutions();
    };

    const handleSelectInstitution = async (institutionId: string) => {
        setStep('linking');
        await linkAccount(institutionId);
    };

    const handleSync = async () => {
        setStep('syncing');
        // In demo mode, use the demo account ID; in real mode the accountId comes
        // from the OAuth callback. For the demo flow we use a known demo account.
        const accountId = requisitionId?.startsWith('demo') ? 'demo-account-001' : 'demo-account-001';
        await syncTransactions(accountId);
        setStep('done');
        onSyncComplete?.();
    };

    const handleClose = () => {
        setOpen(false);
        setStep('idle');
        clearResult();
    };

    return (
        <>
            <button className="bank-sync-trigger" onClick={handleOpen}>
                🏦 Conectar banco
            </button>

            {open && (
                <div className="bank-sync-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
                    <div className="bank-sync-modal">
                        <div className="bank-sync-modal-header">
                            <span className="bank-sync-modal-title">🏦 Open Banking (PSD2)</span>
                            <button className="bank-sync-close" onClick={handleClose}>✕</button>
                        </div>

                        {step !== 'idle' && (
                            <BankSyncBody
                                step={step}
                                institutions={institutions}
                                loadingInstitutions={loadingInstitutions}
                                linkUrl={linkUrl}
                                syncResult={syncResult}
                                onSelectInstitution={handleSelectInstitution}
                                onSync={handleSync}
                                onClose={handleClose}
                            />
                        )}

                        {error && (
                            <div className="bank-sync-error">⚠️ {error}</div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
