import type { BankSyncBodyProps } from '../types/BankSync.types';

export function BankSyncBody({ step, institutions, loadingInstitutions, linkUrl, syncResult, onSelectInstitution, onSync, onClose }: BankSyncBodyProps) {
    if (step === 'selecting') {
        return (
            <div className="bank-sync-body">
                <p className="bank-sync-desc">
                    Selecciona tu banco para conectar y sincronizar tus transacciones automáticamente.
                </p>
                {loadingInstitutions ? (
                    <div className="bank-sync-loading">Cargando bancos…</div>
                ) : (
                    <div className="bank-sync-institutions">
                        {institutions.map((inst) => (
                            <button key={inst.id} className="bank-inst-card" onClick={() => onSelectInstitution(inst.id)}>
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
        );
    }

    if (step === 'linking') {
        return (
            <div className="bank-sync-body">
                {linkUrl ? (
                    <>
                        <p className="bank-sync-desc">
                            Se ha generado tu enlace de autorización. Pulsa el botón para aprobar el acceso en tu banco.
                        </p>
                        <div className="bank-sync-actions">
                            <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="bank-btn bank-btn--primary">
                                🔗 Autorizar acceso
                            </a>
                            <button className="bank-btn bank-btn--secondary" onClick={onSync}>
                                ✅ Ya autoricé — Sincronizar
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="bank-sync-loading">Conectando…</div>
                )}
            </div>
        );
    }

    if (step === 'syncing') {
        return (
            <div className="bank-sync-body bank-sync-center">
                <div className="bank-spinner" />
                <p>Importando transacciones…</p>
            </div>
        );
    }

    if (step === 'done' && syncResult) {
        return (
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
                            {syncResult.transactions.map((tx, i: number) => (
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
                <button className="bank-btn bank-btn--primary" style={{ marginTop: '1rem', width: '100%' }} onClick={onClose}>
                    ✅ Listo
                </button>
            </div>
        );
    }

    return null;
}
