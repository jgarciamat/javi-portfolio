import { useState, useEffect, useRef } from 'react';
import { useAIAdvisor } from '../../application/hooks/useAIAdvisor';
import '../css/AIAdvisor.css';

interface Props {
    year: number;
    month: number;
}

export function AIAdvisor({ year, month }: Props) {
    const { advice, loading, error, analyzed, daysUntilNextAnalysis, justAnalyzed, analyze } = useAIAdvisor({ year, month });
    const [open, setOpen] = useState(false);
    const bodyRef = useRef<HTMLDivElement>(null);
    const isFirstRender = useRef(true);

    // Animate max-height
    useEffect(() => {
        const el = bodyRef.current;
        if (!el) return;
        el.style.maxHeight = open ? el.scrollHeight + 'px' : '0px';
    }, [open]);

    // Recalculate after content changes
    useEffect(() => {
        const el = bodyRef.current;
        if (!el || !open) return;
        el.style.maxHeight = el.scrollHeight + 'px';
    });

    // Only open when a fresh analysis just completed (not on page load / month change)
    useEffect(() => {
        if (justAnalyzed) setOpen(true);
    }, [justAnalyzed]);

    // Close panel when navigating to a different month (skip first render)
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        setOpen(false);
    }, [year, month]);

    return (
        <div className="card ai-advisor">
            <div
                className={`ai-advisor-header${open ? ' ai-advisor-header--open' : ''}`}
                onClick={() => setOpen(v => !v)}
                role="button"
                aria-expanded={open}
                tabIndex={0}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOpen(v => !v)}
            >
                <span className="ai-advisor-title">🤖 Asesor financiero IA</span>
                <div className="ai-advisor-actions" onClick={e => e.stopPropagation()}>
                    <button
                        className={`ai-btn ai-btn--primary${loading ? ' ai-btn--loading' : ''}`}
                        onClick={() => analyze(year, month)}
                        disabled={loading || analyzed}
                        title={analyzed ? `Podrás repetir el análisis en ${daysUntilNextAnalysis} día${daysUntilNextAnalysis !== 1 ? 's' : ''}` : undefined}
                    >
                        {loading ? (
                            <span className="ai-spinner" />
                        ) : analyzed ? (
                            '✅ Analizado'
                        ) : advice ? (
                            '🔄 Reanalizar'
                        ) : (
                            '✨ Analizar mes'
                        )}
                    </button>
                </div>
                <span className="ai-advisor-chevron" aria-hidden="true">›</span>
            </div>

            {analyzed && (
                <p className="ai-cooldown">
                    🕐 Podrás repetir el análisis en {daysUntilNextAnalysis} día{daysUntilNextAnalysis !== 1 ? 's' : ''}
                </p>
            )}

            <div className="ai-advisor-body" ref={bodyRef}>
                <div className="ai-advisor-body-inner">
                    {error && (
                        <div className="ai-error">⚠️ {error}</div>
                    )}

                    {advice && (
                        <div className="ai-content">
                            <p className="ai-summary">{advice.summary}</p>

                            {advice.positives.length > 0 && (
                                <div className="ai-section">
                                    <h4 className="ai-section-title ai-section-title--green">✅ Puntos positivos</h4>
                                    <ul className="ai-list">
                                        {advice.positives.map((p, i) => (
                                            <li key={i} className="ai-list-item ai-list-item--green">{p}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {advice.warnings.length > 0 && (
                                <div className="ai-section">
                                    <h4 className="ai-section-title ai-section-title--red">⚠️ Advertencias</h4>
                                    <ul className="ai-list">
                                        {advice.warnings.map((w, i) => (
                                            <li key={i} className="ai-list-item ai-list-item--red">{w}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {advice.tips.length > 0 && (
                                <div className="ai-section">
                                    <h4 className="ai-section-title ai-section-title--blue">💡 Consejos</h4>
                                    <ul className="ai-list">
                                        {advice.tips.map((t, i) => (
                                            <li key={i} className="ai-list-item ai-list-item--blue">{t}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {!advice && !error && (
                        <p className="ai-placeholder">Pulsa "✨ Analizar mes" para obtener consejos personalizados sobre tus finanzas.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
