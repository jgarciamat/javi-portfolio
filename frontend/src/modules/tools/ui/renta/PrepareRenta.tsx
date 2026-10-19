import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import type { AnnualActivity } from '@modules/finances/domain/annualActivity';
import { loadProgress, saveProgress } from '../../application/rentaProgress';
import { NO_DRAFT } from '../../domain/rentaDraft';
import { activityFromAnnual, withAutonomoActivity } from '../../domain/rentaFromAutonomo';
import { NO_REVIEW } from '../../domain/rentaReview';

/**
 * «Preparar mi declaración de la renta»: takes the year of the self-employed screen to the Renta
 * planner (the activity, its withholdings and its quarterly payments) and opens it. Nothing is filed:
 * the person adds the rest (payers, children, home…) and checks it.
 */
export function PrepareRenta({ annual, onOpen }: { annual: AnnualActivity; onOpen?: () => void }) {
  const { t } = useI18n();
  const [state, setState] = useState<'idle' | 'done' | 'modules'>('idle');
  const prepare = () => {
    const activity = activityFromAnnual(annual);
    if (!activity) {
      setState('modules');
      return;
    }
    const saved = loadProgress();
    const same = saved?.year === annual.year ? saved : null;
    saveProgress({
      year: annual.year,
      form: withAutonomoActivity(same?.form ?? null, activity),
      draft: same?.draft ?? NO_DRAFT,
      review: same?.review ?? NO_REVIEW,
    });
    setState('done');
    onOpen?.();
  };
  return (
    <div className="renta-block">
      <button type="button" className="btn-primary" onClick={prepare}>
        {t('tools.renta.prepare.button', { year: annual.year })}
      </button>
      <p className="section-hint">{t('tools.renta.prepare.hint')}</p>
      {state !== 'idle' && (
        <p className={state === 'done' ? 'renta-recovered' : 'form-error'} role="status">
          {t(`tools.renta.prepare.${state}`)}
        </p>
      )}
    </div>
  );
}
