import { useState, useEffect, useRef } from 'react';
import { useAIAdvisor } from '../../application/hooks/useAIAdvisor';
import { useI18n } from '@core/i18n/I18nContext';
import '../css/AIAdvisor.css';

interface Props {
    year: number;
    month: number;
}

export function AIAdvisor({ year, month }: Props) {
    const { t, locale } = useI18n();
    const { advice, loading, error, analyzed, daysUntilNextAnalysis, hoursUntilNextAnalysis, justAnalyzed, analyze } = useAIAdvisor({ year, month, locale });
    const [open, setOpen] = useState(false);
    const bodyRef = useRef<HTMLDivElement>(null);
    const isFirstRender = useRef(true);

    const cooldownText = (key: string) => {
        const d = daysUntilNextAnalysis;
        const h = hoursUntilNextAnalysis;
        let timeStr: string;
        if (d > 0 && h > 0) {
            timeStr = t('app.ai.cooldown.daysHours')
                .replace('{days}', String(d))
                .replace('{dayPlural}', d !== 1 ? 's' : '')
                .replace('{hours}', String(h))
                .replace('{hourPlural}', h !== 1 ? 's' : '');
        } else if (d > 0) {
            timeStr = t('app.ai.cooldown.daysOnly')
                .replace('{days}', String(d))
                .replace('{dayPlural}', d !== 1 ? 's' : '');
        } else {
            timeStr = t('app.ai.cooldown.hoursOnly')
                .replace('{hours}', String(h))
                .replace('{hourPlural}', h !== 1 ? 's' : '');
        }
        return t(key).replace('{time}', timeStr);
    };

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
                <span className="ai-advisor-title">{t('app.ai.title')}</span>
                <div className="ai-advisor-actions" onClick={e => e.stopPropagation()}>
                    <button
                        className={`ai-btn ai-btn--primary${loading ? ' ai-btn--loading' : ''}`}
                        onClick={() => analyze(year, month)}
                        disabled={loading || analyzed}
                        title={analyzed ? cooldownText('app.ai.cooldown.title') : undefined}
                    >
                        {loading ? (
                            <span className="ai-spinner" />
                        ) : analyzed ? (
                            t('app.ai.btn.analyzed')
                        ) : advice ? (
                            t('app.ai.btn.reanalyze')
                        ) : (
                            t('app.ai.btn.analyze')
                        )}
                    </button>
                </div>
                <span className="ai-advisor-chevron" aria-hidden="true">›</span>
            </div>

            {analyzed && (
                <p className="ai-cooldown">{cooldownText('app.ai.cooldown')}</p>
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
                                    <h4 className="ai-section-title ai-section-title--green">{t('app.ai.section.positives')}</h4>
                                    <ul className="ai-list">
                                        {advice.positives.map((p, i) => (
                                            <li key={i} className="ai-list-item ai-list-item--green">{p}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {advice.warnings.length > 0 && (
                                <div className="ai-section">
                                    <h4 className="ai-section-title ai-section-title--red">{t('app.ai.section.warnings')}</h4>
                                    <ul className="ai-list">
                                        {advice.warnings.map((w, i) => (
                                            <li key={i} className="ai-list-item ai-list-item--red">{w}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {advice.tips.length > 0 && (
                                <div className="ai-section">
                                    <h4 className="ai-section-title ai-section-title--blue">{t('app.ai.section.tips')}</h4>
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
                        <p className="ai-placeholder">{t('app.ai.placeholder')}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
