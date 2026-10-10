import { useI18n } from '@core/i18n/I18nContext';
import type { useGettingStarted } from '../../application/hooks/useGettingStarted';
import type { DashboardTab } from '../navigation';
import '../css/GettingStarted.css';

type Checklist = ReturnType<typeof useGettingStarted>;

/** First steps for a new user: what to try, with progress; it can be hidden for good. */
export function GettingStarted({
  checklist,
  onOpenTab,
}: {
  checklist: Checklist;
  onOpenTab: (tab: DashboardTab) => void;
}) {
  const { t } = useI18n();
  const { steps, completed } = checklist;
  return (
    <section className="card getting-started" aria-label={t('app.gettingStarted.title')}>
      <div className="getting-started-head">
        <h2 className="section-title">🚀 {t('app.gettingStarted.title')}</h2>
        <button className="btn-link" onClick={checklist.hide}>
          {t('app.gettingStarted.hide')}
        </button>
      </div>
      <p className="section-hint">
        {checklist.allDone
          ? t('app.gettingStarted.allDone')
          : t('app.gettingStarted.progress', { done: completed, total: steps.length })}
      </p>
      <div
        className="getting-started-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={completed}
      >
        <span style={{ width: `${(completed / steps.length) * 100}%` }} />
      </div>
      <ul className="getting-started-list">
        {steps.map((step) => (
          <li key={step.id} className={step.done ? 'is-done' : undefined}>
            <span aria-hidden="true">{step.done ? '✅' : '⬜'}</span>
            <span className="getting-started-text">{t(`app.gettingStarted.${step.id}`)}</span>
            {!step.done && step.tab && (
              <button className="btn-secondary" onClick={() => onOpenTab(step.tab as DashboardTab)}>
                {t('app.gettingStarted.go')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
