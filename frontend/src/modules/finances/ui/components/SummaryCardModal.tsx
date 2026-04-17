import { useEffect } from 'react';
import type { SummaryCardDetail } from '../../application/hooks/useSummaryCards';
import { useI18n } from '@core/i18n/I18nContext';

interface SummaryCardModalProps {
    title: string;
    value: string;
    icon: string;
    accent: string;
    detail: SummaryCardDetail;
    onClose: () => void;
}

export function SummaryCardModal({ title, value, icon, accent, detail, onClose }: SummaryCardModalProps) {
    const { t } = useI18n();

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="scm-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
            <div className="scm-panel" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="scm-header" style={{ borderColor: accent }}>
                    <span className="scm-icon">{icon}</span>
                    <div className="scm-header-text">
                        <h2 className="scm-title">{title}</h2>
                        <span className="scm-value" style={{ color: accent }}>{value}</span>
                    </div>
                    <button className="scm-close" onClick={onClose} aria-label={t('app.modal.close')}>✕</button>
                </div>

                {/* Formula */}
                <div className="scm-formula">
                    <span className="scm-formula-label">{t('app.summary.modal.formula')}</span>
                    <code className="scm-formula-text">{detail.formula}</code>
                </div>

                {/* Rows breakdown */}
                {detail.rows.length > 0 && (
                    <div className="scm-rows">
                        {detail.rows.map((row, i) => (
                            <div key={i} className="scm-row">
                                <span className="scm-row-label">{row.label}</span>
                                <span className="scm-row-value" style={{ color: row.accent ?? '#f1f5f9' }}>{row.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Explanation */}
                <p className="scm-explanation">{detail.explanation}</p>
            </div>
        </div>
    );
}
