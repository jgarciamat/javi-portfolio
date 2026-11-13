import { useEffect, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { useAuth } from '@shared/hooks/useAuth';
import { useResource } from '@shared/hooks/useResource';
import { todayDateOnly } from '@shared/utils/format';
import { storage } from '@shared/utils/storage';
import type { FirstStepId, FirstStepProgress } from '../domain/types';
import '@modules/finances/ui/css/GettingStarted.css';
import './css/Billing.css';

/** "Not now": hidden for the rest of the day, unless the progress changes before. */
const hiddenKey = (userId: string) => `mm_invitee_goal_hidden:${userId}`;
/** The "your month is here" message is shown only once. */
const doneKey = (userId: string) => `mm_invitee_goal_done:${userId}`;

const units = (steps: FirstStepProgress[], days: { count: number }) =>
  steps.reduce((sum, s) => sum + s.count, days.count);

/**
 * For a user who signed up with an invitation: the first steps that still stand between them and
 * their free month of Premium (counted by the server, as the reward is), each with a way to do it,
 * and the different days of use in their first month.
 */
export function InviteeGoal({
  onOpenStep,
  dismissible = false,
  refreshKey,
}: {
  onOpenStep: (id: FirstStepId) => void;
  /** With "Not now" (on the month view); in "Your plan" it always shows. */
  dismissible?: boolean;
  /** Fetched again when it changes (e.g. the number of movements of the month). */
  refreshKey?: unknown;
}) {
  const { billingApi } = useApi();
  const { t } = useI18n();
  const userId = useAuth().user?.id ?? '';
  const { data } = useResource(() => billingApi.referral(), [billingApi, refreshKey]);
  const [hidden, setHidden] = useState(() => storage.get(hiddenKey(userId)));
  const [doneSeen] = useState(() => storage.get(doneKey(userId)) === '1');
  const invited = data?.invited ?? null;
  const rewarded = invited?.rewarded === true;

  useEffect(() => {
    if (rewarded && !doneSeen) storage.set(doneKey(userId), '1');
  }, [rewarded, doneSeen, userId]);

  if (!data || !invited) return null;

  if (rewarded) {
    if (doneSeen) return null;
    return (
      <section
        className="card getting-started invitee-goal invitee-goal-done"
        role="status"
        aria-label={t('app.inviteeGoal.done')}
      >
        <h2 className="section-title">
          <Icon name="gift" /> {t('app.inviteeGoal.done')}
        </h2>
        <p>{t('app.inviteeGoal.doneHint', { days: data.rewardDays })}</p>
      </section>
    );
  }

  const { steps, activeDays: days } = invited;
  const marker = `${todayDateOnly()}|${units(steps, days)}`;
  if (dismissible && hidden === marker) return null;
  const completed = [...steps, { done: days.count >= days.goal }].filter((s) => s.done).length;
  const goal = steps.reduce((sum, s) => sum + s.goal, days.goal);
  const progress = t('app.inviteeGoal.progress', { done: completed, total: steps.length + 1 });
  const dismiss = () => {
    storage.set(hiddenKey(userId), marker);
    setHidden(marker);
  };

  return (
    <section className="card getting-started invitee-goal" aria-label={t('app.inviteeGoal.title')}>
      <div className="invitee-goal-head">
        <h2 className="section-title">
          <Icon name="gift" /> {t('app.inviteeGoal.title')}
        </h2>
        {dismissible && (
          <button type="button" className="btn-link" onClick={dismiss}>
            {t('app.inviteeGoal.dismiss')}
          </button>
        )}
      </div>
      <p className="section-hint">
        {invited.eligible
          ? t('app.inviteeGoal.hint', { days: data.rewardDays })
          : t('app.inviteeGoal.notEligible')}
      </p>
      <p className="section-hint">{progress}</p>
      <div
        className="getting-started-bar"
        role="progressbar"
        aria-label={t('app.inviteeGoal.title')}
        aria-valuetext={progress}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={units(steps, days)}
      >
        <span style={{ width: `${(units(steps, days) / goal) * 100}%` }} />
      </div>
      <ul className="getting-started-list">
        {steps.map((step) => (
          <li key={step.id} className={step.done ? 'is-done' : undefined}>
            <span aria-hidden="true">{step.done ? '✅' : '⬜'}</span>
            <span className="getting-started-text">
              {t(`app.inviteeGoal.${step.id}`, { count: step.count, goal: step.goal })}
              {step.done && <span className="sr-only"> · {t('app.inviteeGoal.stepDone')}</span>}
            </span>
            {!step.done && (
              <button type="button" className="btn-secondary" onClick={() => onOpenStep(step.id)}>
                {t(`app.inviteeGoal.go.${step.id}`)}
              </button>
            )}
          </li>
        ))}
        <DaysStep days={days} />
      </ul>
    </section>
  );
}

/** The different days of use: nothing to press, they come with using the app. */
function DaysStep({ days }: { days: { count: number; goal: number } }) {
  const { t } = useI18n();
  const done = days.count >= days.goal;
  return (
    <li className={done ? 'is-done' : undefined}>
      <span aria-hidden="true">{done ? '✅' : '⬜'}</span>
      <span className="getting-started-text">
        {t('app.inviteeGoal.days', days)}
        {done && <span className="sr-only"> · {t('app.inviteeGoal.stepDone')}</span>}
      </span>
    </li>
  );
}
