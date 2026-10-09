import { useState, type FormEvent } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { errorMessage } from '@shared/utils/errors';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import type { AIAnswer } from '@modules/finances/domain/types';
import '../css/AIAdvisor.css';

/** Free-form questions about the user's own figures (Premium; answered from aggregated data). */
export function AskAssistant() {
  const { insightsApi } = useApi();
  const { t, locale } = useI18n();
  const plan = useOptionalPlan();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (plan && !plan.isPremium) {
    return (
      <div className="ai-ask">
        <p className="ai-placeholder">{t('app.ask.locked')}</p>
        <button
          className="ai-btn ai-btn--primary"
          onClick={() => plan.openUpgrade({ kind: 'feature', feature: 'aiAdvisor' })}
        >
          ⭐ {t('billing.seePlans')}
        </button>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const text = question.trim();
    if (text.length < 3) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await insightsApi.ask(text, locale));
    } catch (err) {
      setResult(null);
      setError(errorMessage(err, t('app.ask.error')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="ai-ask" onSubmit={submit}>
      <label className="ai-ask-label" htmlFor="ai-ask-input">
        {t('app.ask.title')}
      </label>
      <div className="ai-ask-row">
        <input
          id="ai-ask-input"
          className="tx-input"
          value={question}
          maxLength={300}
          placeholder={t('app.ask.placeholder')}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button className="ai-btn ai-btn--primary" type="submit" disabled={loading}>
          {loading ? t('app.common.loading') : t('app.ask.submit')}
        </button>
      </div>
      {error && <div className="ai-error">⚠️ {error}</div>}
      {result && (
        <div className="ai-ask-answer" role="status">
          <p>{result.answer}</p>
          <p className="ai-quota">
            {t('app.ai.quota', { used: result.ai.used, quota: result.ai.quota })}
          </p>
        </div>
      )}
      <p className="ai-quota">{t('app.ask.privacy')}</p>
    </form>
  );
}
