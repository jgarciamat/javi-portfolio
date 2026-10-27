import { useEffect, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { useResource } from '@shared/hooks/useResource';
import { intlLocale, todayDateOnly } from '@shared/utils/format';
import { storage } from '@shared/utils/storage';
import { useFinances } from '../../application/FinancesContext';
import { useEnoughData } from '../../application/hooks/useEnoughData';
import {
  NO_SPEND_TARGET,
  PILLAR_POINTS,
  challengeProgress,
  healthScore,
  noSpendDays,
  type ChallengeId,
  type ChallengeProgress,
  type Health,
} from '../../domain/health';
import '../css/Sections.css';
import '../css/Health.css';

const CHALLENGES: ChallengeId[] = ['noSpend', 'save20', 'budgets'];
const STORAGE_KEY = 'mm_challenge';
const DONE_KEY = 'mm_challenge_done';

const RING = 2 * Math.PI * 52;

/** The score as a ring with the number inside. */
function ScoreRing({ health }: { health: Health }) {
  const { t } = useI18n();
  return (
    <div className={`health-ring health-ring--${health.level}`}>
      <svg
        viewBox="0 0 120 120"
        role="img"
        aria-label={t('app.health.score', { score: health.score })}
      >
        <circle className="health-ring-track" cx="60" cy="60" r="52" />
        <circle
          className="health-ring-value"
          cx="60"
          cy="60"
          r="52"
          strokeDasharray={RING}
          strokeDashoffset={RING * (1 - health.score / 100)}
        />
      </svg>
      <strong>{health.score}</strong>
    </div>
  );
}

function Pillars({ health }: { health: Health }) {
  const { t, locale } = useI18n();
  const { percent } = useFormat();
  // «4,1/25» and «16,3 meses» with the decimal mark of the language, like every other figure.
  const points = (value: number) => value.toLocaleString(intlLocale(locale));
  const text = (id: string, value: number) =>
    id === 'cushion' && value === 1
      ? t('app.health.detail.cushionOne')
      : t(`app.health.detail.${id}`, {
          value: id === 'cushion' ? points(value) : percent(value, 0),
        });
  return (
    <ul className="health-pillars">
      {health.pillars.map((p) => (
        <li key={p.id}>
          <div className="health-pillar-head">
            <strong>{t(`app.health.pillar.${p.id}`)}</strong>
            <span>{t('app.health.points', { points: points(p.points), max: PILLAR_POINTS })}</span>
          </div>
          <div className="health-bar" aria-hidden="true">
            <span style={{ width: `${(p.points / PILLAR_POINTS) * 100}%` }} />
          </div>
          <small>{text(p.id, p.value)}</small>
        </li>
      ))}
    </ul>
  );
}

/** The challenges completed in a month; they stay completed whatever is chosen next. */
function readDone(period: string): ChallengeId[] {
  const saved = storage.getJSON<{ period: string; ids: ChallengeId[] } | null>(DONE_KEY, null);
  return saved?.period === period && Array.isArray(saved.ids) ? saved.ids : [];
}

/** Completed challenges of the month: a challenge that is done now is saved right away. */
function useCompleted(period: string, doneNow: ChallengeId | null): ChallengeId[] {
  const [stored, setStored] = useState<ChallengeId[]>(() => readDone(period));
  useEffect(() => {
    if (doneNow && !stored.includes(doneNow)) {
      const ids = [...stored, doneNow];
      storage.setJSON(DONE_KEY, { period, ids });
      setStored(ids);
    }
  }, [doneNow, stored, period]);
  return doneNow && !stored.includes(doneNow) ? [...stored, doneNow] : stored;
}

const barWidth = (p: { current: number; target: number }) =>
  p.target > 0 ? Math.min(100, (p.current / p.target) * 100) : 0;

function ChallengeDetail({
  id,
  shown,
  isDone,
  isActive,
  streak,
  onChange,
}: {
  id: ChallengeId;
  shown: ChallengeProgress;
  isDone: boolean;
  isActive: boolean;
  streak: number;
  onChange: () => void;
}) {
  const { t } = useI18n();
  const current = Math.min(shown.current, shown.target);
  return (
    <div className="challenge-detail">
      <div
        className="health-bar"
        role="progressbar"
        aria-label={t(`app.challenge.${id}`)}
        aria-valuemin={0}
        aria-valuemax={shown.target}
        aria-valuenow={current}
      >
        <span style={{ width: `${isDone ? 100 : barWidth(shown)}%` }} />
      </div>
      <p>{t('app.challenge.progress', { current, target: shown.target })}</p>
      {shown.done && (
        <p className="section-success">
          <Icon name="checkCircle" /> {t('app.challenge.done')}
        </p>
      )}
      {id === 'noSpend' && (
        <p className="section-hint">{t('app.challenge.streak', { days: streak })}</p>
      )}
      {isActive && (
        <button className="btn-secondary" onClick={onChange}>
          {t('app.challenge.change')}
        </button>
      )}
    </div>
  );
}

function ChallengeStatus({
  isDone,
  isActive,
  disabled,
  onPick,
}: {
  isDone: boolean;
  isActive: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  const { t } = useI18n();
  if (isDone) {
    return (
      <span className="challenge-badge">
        <Icon name="checkCircle" /> {t('app.challenge.doneBadge')}
      </span>
    );
  }
  if (isActive) {
    return (
      <span className="challenge-badge challenge-badge-active">
        {t('app.challenge.inProgress')}
      </span>
    );
  }
  return (
    <button className="btn-secondary" disabled={disabled} onClick={onPick}>
      {t('app.challenge.choose')}
    </button>
  );
}

function Challenges({
  period,
  noSpend,
  health,
}: {
  period: string;
  noSpend: { days: number; streak: number };
  health: { income: number; saving: number };
}) {
  const { t } = useI18n();
  const f = useFinances();
  const [chosen, setChosen] = useState<ChallengeId | null>(() => {
    const saved = storage.getJSON<{ id: ChallengeId; period: string } | null>(STORAGE_KEY, null);
    return saved?.period === period ? saved.id : null;
  });
  const pick = (id: ChallengeId | null) => {
    storage.set(STORAGE_KEY, id ? JSON.stringify({ id, period }) : null);
    setChosen(id);
  };
  const progress = chosen
    ? challengeProgress(chosen, {
        noSpendDays: noSpend.days,
        income: health.income,
        saving: health.saving,
        budgets: f.budgets,
      })
    : null;
  const completed = useCompleted(period, chosen && progress?.done ? chosen : null);
  const allDone = CHALLENGES.every((id) => completed.includes(id));

  return (
    <div className="card">
      <h2 className="section-title">
        <Icon name="flag" /> {t('app.challenge.title')}
      </h2>
      {!f.isCurrentPeriod ? (
        <p className="section-hint">{t('app.challenge.currentOnly')}</p>
      ) : (
        <>
          <p className="section-hint">
            {allDone ? t('app.challenge.allDone') : t('app.challenge.hint')}
          </p>
          <ul className="challenge-list">
            {CHALLENGES.map((id) => {
              const isDone = completed.includes(id);
              const isActive = id === chosen && !isDone;
              return (
                <li key={id} className={isDone ? 'challenge-done' : undefined}>
                  <span>
                    <strong>{t(`app.challenge.${id}`)}</strong>
                    <small>{t(`app.challenge.${id}.desc`, { target: NO_SPEND_TARGET })}</small>
                  </span>
                  <ChallengeStatus
                    isDone={isDone}
                    isActive={isActive}
                    disabled={id === 'budgets' && f.budgets.length === 0}
                    onPick={() => pick(id)}
                  />
                  {id === chosen && progress && (
                    <ChallengeDetail
                      id={id}
                      shown={progress}
                      isDone={isDone}
                      isActive={isActive}
                      streak={noSpend.streak}
                      onChange={() => pick(null)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
          {f.budgets.length === 0 && !completed.includes('budgets') && (
            <p className="section-hint">{t('app.challenge.noBudgets')}</p>
          )}
        </>
      )}
    </div>
  );
}

/** A score for the person's finances, what is behind it, and monthly challenges. */
export function HealthView() {
  const { assetApi, monthApi } = useApi();
  const { t } = useI18n();
  const f = useFinances();
  const previous =
    f.month === 1 ? { year: f.year - 1, month: 12 } : { year: f.year, month: f.month - 1 };
  const before = useResource(
    () => monthApi.get(previous.year, previous.month),
    [monthApi, previous.year, previous.month]
  );
  // The debts come from a Premium section: without them that pillar is left out.
  const assets = useResource(() => assetApi.getAll(), [assetApi]);
  const enough = useEnoughData();

  if (!f.summary) return <div className="card">{t('app.common.loading')}</div>;
  const income = f.summary.totalIncome;
  const baseline =
    before.data && before.data.summary.totalExpenses > 0
      ? before.data.summary.totalExpenses
      : f.summary.totalExpenses;
  const debt = assets.data
    ? assets.data.filter((a) => a.kind === 'debt').reduce((sum, a) => sum + a.value, 0)
    : null;
  const health = healthScore({
    income,
    saving: f.summary.totalSaving,
    monthlyExpenses: baseline,
    liquid: f.accounts.filter((a) => !a.archived).reduce((sum, a) => sum + a.balance, 0),
    debt,
    budgets: f.budgets,
  });
  const days = noSpendDays(f.transactions, f.periodStart as string, todayDateOnly());

  return (
    <div className="section-view">
      <div className="card">
        <h2 className="section-title">
          <Icon name="heart" /> {t('app.health.title')}
        </h2>
        <p className="section-hint">{t('app.health.hint')}</p>
        {/* A new account would only get a low score for data it does not have yet. */}
        {enough ? (
          <>
            <div className="health-head">
              <ScoreRing health={health} />
              <div>
                <p className="health-level">{t(`app.health.level.${health.level}`)}</p>
                <p className="section-hint">{t('app.health.score', { score: health.score })}</p>
              </div>
            </div>
            <Pillars health={health} />
            {debt === null && <p className="section-hint">{t('app.health.noDebts')}</p>}
            {f.budgets.length === 0 && <p className="section-hint">{t('app.health.noBudgets')}</p>}
          </>
        ) : (
          <p className="section-hint health-not-yet" role="status">
            <Icon name="info" /> {t('app.health.notYet')}
          </p>
        )}
      </div>
      <Challenges
        period={`${f.year}-${f.month}`}
        noSpend={days}
        health={{ income, saving: f.summary.totalSaving }}
      />
    </div>
  );
}
