import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import type { AnnualActivity } from '@modules/finances/domain/annualActivity';
import { loadProgress, removeSavedAutonomo, saveProgress } from '../../application/rentaProgress';
import { NO_DRAFT } from '../../domain/rentaDraft';
import {
  AUTONOMO_ACTIVITY,
  activityFromAnnual,
  withAutonomoActivity,
} from '../../domain/rentaFromAutonomo';
import { NO_REVIEW } from '../../domain/rentaReview';
import { AnnualFigures } from './AutonomoBring';

/** What goes to the Renta, to confirm before taking it. */
function Confirm({
  annual,
  savedYear,
  onTake,
  onCancel,
  onRemove,
}: {
  annual: AnnualActivity;
  /** The year of the Renta half done on this device, if any. */
  savedYear: number | null;
  onTake: () => void;
  onCancel: () => void;
  /** Set when the activity of this year is already in the saved Renta. */
  onRemove?: () => void;
}) {
  const { t } = useI18n();
  const k = 'tools.renta.prepare';
  return (
    <div className="renta-bring-confirm">
      <p>{t(`${k}.summary`, { year: annual.year })}</p>
      <AnnualFigures annual={annual} onRemove={onRemove} />
      {annual.payments130.source.includes('estimated') && (
        <p className="section-hint">{t(`${k}.estimated`)}</p>
      )}
      {/* A Renta of another year left half done on this device: taking this one replaces it. */}
      {savedYear !== null && savedYear !== annual.year && (
        <p className="form-error">{t(`${k}.replaces`, { year: annual.year, saved: savedYear })}</p>
      )}
      <div className="button-row">
        <button type="button" className="btn-primary" onClick={onTake}>
          {t(`${k}.take`, { year: annual.year })}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          {t(`${k}.cancel`)}
        </button>
      </div>
    </div>
  );
}

type State = 'idle' | 'confirm' | 'removed' | 'done' | 'modules' | 'empty' | 'otherYear';

/**
 * «Preparar mi declaración de la renta»: takes the year of the self-employed screen to the Renta of
 * the same year (the activity, its withholdings and its quarterly payments) and opens it. First it
 * shows what it brings, to confirm; it says so when there is nothing of that year. Nothing is filed:
 * the person adds the rest (payers, children, home…) and checks it.
 */
export function PrepareRenta({
  annual,
  onOpen,
  hasData = true,
  years = [],
  onYear,
}: {
  annual: AnnualActivity;
  onOpen?: () => void;
  /** Something was typed or imported on the self-employed screen. */
  hasData?: boolean;
  /** The years of the imported invoices, most invoices first (none: typed by hand). */
  years?: number[];
  /** Changes the year of the self-employed screen. */
  onYear?: (year: number) => void;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<State>('idle');
  const saved = loadProgress();
  const check = () => {
    if (!hasData) return setState('empty');
    if (years.length > 0 && !years.includes(annual.year)) return setState('otherYear');
    setState(activityFromAnnual(annual) ? 'confirm' : 'modules');
  };
  const inRenta =
    saved?.year === annual.year &&
    (saved.form.activities ?? []).some((a) => a.name === AUTONOMO_ACTIVITY);
  const remove = () => {
    removeSavedAutonomo();
    setState('removed');
  };
  const take = () => {
    const activity = activityFromAnnual(annual)!;
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
  const k = 'tools.renta.prepare';
  return (
    <div className="renta-block" id="autonomo-prepare-renta">
      <button type="button" className="btn-primary" onClick={check}>
        {t(`${k}.button`, { year: annual.year })}
      </button>
      <p className="section-hint">{t(`${k}.hint`)}</p>
      {state === 'confirm' && (
        <Confirm
          annual={annual}
          savedYear={saved?.year ?? null}
          onTake={take}
          onCancel={() => setState('idle')}
          onRemove={inRenta ? remove : undefined}
        />
      )}
      {state === 'otherYear' && (
        <div className="form-error" role="status">
          <p>{t(`${k}.otherYear`, { year: annual.year, years: years.join(', ') })}</p>
          {onYear && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                onYear(years[0]);
                setState('idle');
              }}
            >
              {t(`${k}.switch`, { year: years[0] })}
            </button>
          )}
        </div>
      )}
      {state === 'removed' && (
        <p className="renta-recovered" role="status">
          {t('tools.renta.removeActivity.removed')}
        </p>
      )}
      {(state === 'done' || state === 'modules' || state === 'empty') && (
        <p className={state === 'done' ? 'renta-recovered' : 'form-error'} role="status">
          {t(`${k}.${state}`, { year: annual.year })}
        </p>
      )}
    </div>
  );
}
