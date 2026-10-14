import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import { useResource } from '@shared/hooks/useResource';
import { todayDateOnly } from '@shared/utils/format';
import { storage } from '@shared/utils/storage';
import { useFinances } from '../../application/FinancesContext';
import {
  NO_SPEND_TARGET,
  PILLAR_POINTS,
  challengeProgress,
  healthScore,
  noSpendDays,
  type ChallengeId,
  type Health,
} from '../../domain/health';
import '../css/Sections.css';
import '../css/Health.css';

const CHALLENGES: ChallengeId[] = ['noSpend', 'save20', 'budgets'];
const STORAGE_KEY = 'mm_challenge';

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
  const { t } = useI18n();
  const { percent } = useFormat();
  const text = (id: string, value: number) =>
    t(`app.health.detail.${id}`, { value: id === 'cushion' ? value : percent(value, 0) });
  return (
    <ul className="health-pillars">
      {health.pillars.map((p) => (
        <li key={p.id}>
          <div className="health-pillar-head">
            <strong>{t(`app.health.pillar.${p.id}`)}</strong>
            <span>{t('app.health.points', { points: p.points, max: PILLAR_POINTS })}</span>
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

  return (
    <div className="card">
      <h2 className="section-title">
        <Icon name="flag" /> {t('app.challenge.title')}
      </h2>
      {!f.isCurrentPeriod ? (
        <p className="section-hint">{t('app.challenge.currentOnly')}</p>
      ) : chosen && progress ? (
        <div className="challenge-active">
          <strong>{t(`app.challenge.${chosen}`)}</strong>
          <p className="section-hint">
            {t(`app.challenge.${chosen}.desc`, { target: NO_SPEND_TARGET })}
          </p>
          <div
            className="health-bar"
            role="progressbar"
            aria-label={t(`app.challenge.${chosen}`)}
            aria-valuemin={0}
            aria-valuemax={progress.target}
            aria-valuenow={Math.min(progress.current, progress.target)}
          >
            <span
              style={{
                width: `${
                  progress.target > 0
                    ? Math.min(100, (progress.current / progress.target) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <p>
            {t('app.challenge.progress', { current: progress.current, target: progress.target })}
          </p>
          {progress.done && (
            <p className="section-success">
              <Icon name="checkCircle" /> {t('app.challenge.done')}
            </p>
          )}
          {chosen === 'noSpend' && (
            <p className="section-hint">{t('app.challenge.streak', { days: noSpend.streak })}</p>
          )}
          <button className="btn-secondary" onClick={() => pick(null)}>
            {t('app.challenge.change')}
          </button>
        </div>
      ) : (
        <>
          <p className="section-hint">{t('app.challenge.hint')}</p>
          <ul className="challenge-list">
            {CHALLENGES.map((id) => (
              <li key={id}>
                <span>
                  <strong>{t(`app.challenge.${id}`)}</strong>
                  <small>{t(`app.challenge.${id}.desc`, { target: NO_SPEND_TARGET })}</small>
                </span>
                <button
                  className="btn-secondary"
                  disabled={id === 'budgets' && f.budgets.length === 0}
                  onClick={() => pick(id)}
                >
                  {t('app.challenge.choose')}
                </button>
              </li>
            ))}
          </ul>
          {f.budgets.length === 0 && <p className="section-hint">{t('app.challenge.noBudgets')}</p>}
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
      </div>
      <Challenges
        period={`${f.year}-${f.month}`}
        noSpend={days}
        health={{ income, saving: f.summary.totalSaving }}
      />
    </div>
  );
}
