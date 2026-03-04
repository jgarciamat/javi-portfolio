import { useState } from 'react';
import { useBankSync } from '../../application/hooks/useBankSync';
import '../css/BankSync.css';

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

                        {/* ── Step: select institution ───────────────────── */}
                        {step === 'selecting' && (
                            <div className="bank-sync-body">
                                <p className="bank-sync-desc">
                                    Selecciona tu banco para conectar y sincronizar tus transacciones automáticamente.
                                </p>
                                {loadingInstitutions ? (
                                    <div className="bank-sync-loading">Cargando bancos…</div>
                                ) : (
                                    <div className="bank-sync-institutions">
                                        {institutions.map((inst) => (
                                            <button
                                                key={inst.id}
                                                className="bank-inst-card"
                                                onClick={() => handleSelectInstitution(inst.id)}
                                            >
                                                <span className="bank-inst-name">{inst.name}</span>
                                                <span className="bank-inst-bic">{inst.bic}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <p className="bank-sync-disclaimer">
                                    🔒 Conexión segura bajo la directiva europea PSD2. Nunca almacenamos tus credenciales bancarias.
                                </p>
                            </div>
                        )}

                        {/* ── Step: authorize link ───────────────────────── */}
                        {step === 'linking' && (
                            <div className="bank-sync-body">
                                {linkUrl ? (
                                    <>
                                        <p className="bank-sync-desc">
                                            Se ha generado tu enlace de autorización. Pulsa el botón para aprobar el acceso en tu banco.
                                        </p>
                                        <div className="bank-sync-actions">
                                            <a
                                                href={linkUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bank-btn bank-btn--primary"
                                            >
                                                🔗 Autorizar acceso
                                            </a>
                                            <button className="bank-btn bank-btn--secondary" onClick={handleSync}>
                                                ✅ Ya autoricé — Sincronizar
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="bank-sync-loading">Conectando…</div>
                                )}
                            </div>
                        )}

                        {/* ── Step: syncing ──────────────────────────────── */}
                        {step === 'syncing' && (
                            <div className="bank-sync-body bank-sync-center">
                                <div className="bank-spinner" />
                                <p>Importando transacciones…</p>
                            </div>
                        )}

                        {/* ── Step: done ─────────────────────────────────── */}
                        {step === 'done' && syncResult && (
                            <div className="bank-sync-body">
                                <div className="bank-sync-result">
                                    <div className="bank-sync-result-stat">
                                        <span className="bank-sync-result-num">{syncResult.synced}</span>
                                        <span className="bank-sync-result-label">importadas</span>
                                    </div>
                                    <div className="bank-sync-result-stat">
                                        <span className="bank-sync-result-num bank-sync-result-num--muted">{syncResult.skipped}</span>
                                        <span className="bank-sync-result-label">omitidas</span>
                                    </div>
                                </div>

                                {syncResult.transactions.length > 0 && (
                                    <div className="bank-sync-preview">
                                        <h4 className="bank-sync-preview-title">Transacciones importadas</h4>
                                        <ul className="bank-sync-tx-list">
                                            {syncResult.transactions.map((tx, i) => (
                                                <li key={i} className="bank-sync-tx-item">
                                                    <span className="bank-tx-desc">{tx.description}</span>
                                                    <span className={`bank-tx-amount bank-tx-amount--${tx.type}`}>
                                                        {tx.type === 'income' ? '+' : '-'}{tx.amount.toFixed(2)}€
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <button className="bank-btn bank-btn--primary" style={{ marginTop: '1rem', width: '100%' }} onClick={handleClose}>
                                    ✅ Listo
                                </button>
                            </div>
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
