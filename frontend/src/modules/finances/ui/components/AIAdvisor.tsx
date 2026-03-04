import { useAIAdvisor } from '../../application/hooks/useAIAdvisor';
import '../css/AIAdvisor.css';

interface Props {
    year: number;
    month: number;
}

export function AIAdvisor({ year, month }: Props) {
    const { advice, loading, error, analyze, clear } = useAIAdvisor();

    return (
        <div className="ai-advisor">
            <div className="ai-advisor-header">
                <span className="ai-advisor-title">🤖 Asesor financiero IA</span>
                <div className="ai-advisor-actions">
                    {advice && (
                        <button className="ai-btn ai-btn--ghost" onClick={clear}>
                            ✕ Cerrar
                        </button>
                    )}
                    <button
                        className="ai-btn ai-btn--primary"
                        onClick={() => analyze(year, month)}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="ai-spinner" />
                        ) : advice ? (
                            '🔄 Reanalizar'
                        ) : (
                            '✨ Analizar mes'
                        )}
                    </button>
                </div>
            </div>

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
        </div>
    );
}
