import { useBankSync } from '../../application/hooks/useBankSync';
import '../css/BankSync.css';
import { BankSyncBody } from './BankSyncBody';
import type { BankSyncProps } from '../types/BankSync.types';

export function BankSync({ onSyncComplete }: BankSyncProps) {
    const {
        institutions,
        loadingInstitutions,
        syncResult,
        error,
        linkUrl,
        open,
        step,
        handleOpen,
        handleSelectInstitution,
        handleSync,
        handleClose,
    } = useBankSync(onSyncComplete);

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
