import { useEffect, useId, useRef, useState } from 'react';
import { useAIAdvisor } from '../../application/hooks/useAIAdvisor';
import { useI18n } from '@core/i18n/I18nContext';
import '../css/AIAdvisor.css';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { AskAssistant } from './AskAssistant';
import '@modules/billing/ui/css/Billing.css';
import type { AIAdvice } from '@modules/finances/domain/types';

interface AIAdviceContentProps {
  advice: AIAdvice | null;
  error: string | null;
  t: (k: string, vars?: Record<string, string | number>) => string;
}

/** Message shown when the automatic (rule-based) analysis replaced the AI one. */
const FALLBACK_KEYS: Record<NonNullable<AIAdvice['reason']>, string | null> = {
  premium_required: 'app.ai.fallback.premium',
  quota: 'app.ai.fallback.quota',
  budget: 'app.ai.fallback.budget',
  error: 'app.ai.fallback.error',
  unavailable: null,
  no_data: null,
};

const SECTIONS = [
  { key: 'positives', titleKey: 'app.ai.section.positives', tone: 'green' },
  { key: 'warnings', titleKey: 'app.ai.section.warnings', tone: 'red' },
  { key: 'tips', titleKey: 'app.ai.section.tips', tone: 'blue' },
] as const;

function FallbackNotice({ advice, t }: Pick<AIAdviceContentProps, 'advice' | 't'>) {
  const plan = useOptionalPlan();
  const reason = advice?.source === 'rules' ? advice.reason : undefined;
  // A free user who spent their one analysis is offered Premium (10 a month).
  const spentFree = reason === 'quota' && plan !== null && !plan.isPremium;
  const fallbackKey = spentFree
    ? 'app.ai.fallback.quotaFree'
    : reason
    ? FALLBACK_KEYS[reason]
    : null;
  if (!fallbackKey) return null;
  return (
    <div className="ai-fallback">
      <span>{t(fallbackKey)}</span>
      {(reason === 'premium_required' || spentFree) && plan && (
        <button
          className="ai-btn ai-btn--primary"
          onClick={() => plan.openUpgrade({ kind: 'feature', feature: 'aiAdvisor' })}
        >
          ⭐ {t('billing.seePlans')}
        </button>
      )}
    </div>
  );
}

function AIAdviceContent({ advice, error, t }: AIAdviceContentProps) {
  return (
    <>
      {error && <div className="ai-error">⚠️ {error}</div>}
      <FallbackNotice advice={advice} t={t} />
      {advice && (
        <div className="ai-content">
          <p className="ai-summary">{advice.summary}</p>
          {SECTIONS.filter(({ key }) => advice[key].length > 0).map(({ key, titleKey, tone }) => (
            <div key={key} className="ai-section">
              <h4 className={`ai-section-title ai-section-title--${tone}`}>{t(titleKey)}</h4>
              <ul className="ai-list">
                {advice[key].map((item, i) => (
                  <li key={i} className={`ai-list-item ai-list-item--${tone}`}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {advice?.source === 'ai' && advice.ai && (
        <p className="ai-quota">
          {t('app.ai.quota', { used: advice.ai.used, quota: advice.ai.quota })}
        </p>
      )}
      {!advice && !error && <p className="ai-placeholder">{t('app.ai.placeholder')}</p>}
    </>
  );
}

export function AIAdvisor({
  year,
  month,
  onAnalyzed,
}: {
  year: number;
  month: number;
  /** A fresh analysis was made (the getting-started step). */
  onAnalyzed: () => void;
}) {
  const { t, locale } = useI18n();
  const { advice, loading, error, justAnalyzed, analyze } = useAIAdvisor({ year, month, locale });
  const plan = useOptionalPlan();
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  // A fresh analysis opens the panel; another month closes it.
  const analyzed = useRef(onAnalyzed);
  analyzed.current = onAnalyzed;
  useEffect(() => {
    if (!justAnalyzed) return;
    setOpen(true);
    analyzed.current();
  }, [justAnalyzed]);
  useEffect(() => setOpen(false), [year, month]);

  return (
    <div className="card ai-advisor">
      <div className={`ai-advisor-header${open ? ' ai-advisor-header--open' : ''}`}>
        <button
          type="button"
          className="ai-advisor-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={bodyId}
        >
          <span className="ai-advisor-title">
            {t('app.ai.title')}
            {plan && <span className="premium-chip">Premium</span>}
          </span>
          <span className="ai-advisor-chevron" aria-hidden="true">
            ›
          </span>
        </button>
        <button
          className={`ai-btn ai-btn--primary${loading ? ' ai-btn--loading' : ''}`}
          onClick={() => analyze(year, month)}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <span className="ai-spinner" aria-label={t('app.common.loading')} />
          ) : (
            t(advice ? 'app.ai.btn.reanalyze' : 'app.ai.btn.analyze')
          )}
        </button>
      </div>

      <div id={bodyId} className={`ai-advisor-body${open ? ' ai-advisor-body--open' : ''}`}>
        <div className="ai-advisor-body-inner">
          <AIAdviceContent advice={advice} error={error} t={t} />
          <AskAssistant />
        </div>
      </div>
    </div>
  );
}
