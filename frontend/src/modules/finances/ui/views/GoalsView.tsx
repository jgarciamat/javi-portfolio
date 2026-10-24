import { useEffect, useMemo, useRef, useState } from 'react';
import { track } from '@core/analytics';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { recordPositiveMoment } from '@core/review/review';
import { useFormat, useOptionalSettings } from '@core/settings/SettingsContext';
import { useAction } from '@shared/hooks/useAction';
import { useResource } from '@shared/hooks/useResource';
import { parseDecimal } from '@shared/utils/numbers';
import type { Category, Goal, GoalInput } from '@modules/finances/domain/types';
import { useFinances } from '../../application/FinancesContext';
import '../css/Sections.css';
import { EmojiPickerButton } from '../components/EmojiPickerButton';
import { Icon } from '@shared/components/Icon';
import { ExportButtons } from '../components/ExportButtons';
import { GoalDateLine, type LeaksForGoal } from '../components/GoalDateSheet';
import type { YearMonth } from '../../domain/goalDate';
import type { DashboardTab } from '../navigation';

function GoalCard({
  goal,
  current,
  leaks,
  onOpenTab,
  onToggleArchive,
  onDelete,
}: {
  goal: Goal;
  current: YearMonth;
  leaks: LeaksForGoal | null;
  onOpenTab: (tab: DashboardTab) => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}) {
  const { t, tCategory } = useI18n();
  const { money, date } = useFormat();
  const { progress } = goal;
  const archiveLabel = t(goal.archived ? 'app.accounts.unarchive' : 'app.accounts.archive');
  return (
    <li className={`goal-card${goal.archived ? ' entity-item--muted' : ''}`}>
      <div className="goal-head">
        <span className="goal-name">
          {goal.icon} {goal.name}
          {progress.completed && <span className="pill pill--ok">{t('app.goals.completed')}</span>}
        </span>
        <span className="goal-amount">
          {money(progress.saved)} / {money(goal.target)}
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={goal.name}
        aria-valuenow={progress.percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="progress-fill"
          style={{ width: `${progress.percentage}%`, background: goal.color }}
        />
      </div>
      <div className="goal-meta">
        <span>📁 {tCategory(goal.categoryName)}</span>
        {goal.targetDate && (
          <span>
            <Icon name="calendar" /> {date(goal.targetDate)}
          </span>
        )}
        {progress.monthlyNeeded !== null && !progress.completed && (
          <span>{t('app.goals.monthlyNeeded', { amount: money(progress.monthlyNeeded) })}</span>
        )}
      </div>
      {!goal.archived && !progress.completed && (
        <GoalDateLine goal={goal} current={current} leaks={leaks} onOpenTab={onOpenTab} />
      )}
      <div className="entity-actions">
        <button
          className="icon-btn"
          onClick={onToggleArchive}
          aria-label={archiveLabel}
          title={archiveLabel}
        >
          {goal.archived ? '♻️' : '🗄️'}
        </button>
        <button
          className="icon-btn"
          onClick={onDelete}
          aria-label={`${t('app.common.delete')} ${goal.name}`}
          title={t('app.common.delete')}
        >
          <Icon name="trash" />
        </button>
      </div>
    </li>
  );
}

const EMPTY_GOAL = { name: '', target: '', targetDate: '', category: '', icon: '🎯' };

function GoalForm({
  categories,
  onCreate,
  saving,
}: {
  categories: Category[];
  onCreate: (input: GoalInput) => Promise<boolean>;
  saving: boolean;
}) {
  const { t, tCategory } = useI18n();
  const [form, setForm] = useState(EMPTY_GOAL);
  const set = (key: keyof typeof EMPTY_GOAL) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form
      className="inline-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const created = await onCreate({
          name: form.name.trim(),
          target: parseDecimal(form.target),
          targetDate: form.targetDate || null,
          category: form.category || undefined,
          // The emoji only matters when the goal creates its own category.
          icon: form.category ? undefined : form.icon,
        });
        if (created) setForm(EMPTY_GOAL);
      }}
    >
      <label className="field">
        <span className="field-label">{t('app.goals.name')}</span>
        <input
          className="tx-input"
          value={form.name}
          onChange={set('name')}
          maxLength={80}
          required
        />
      </label>
      <label className="field">
        <span className="field-label">{t('app.goals.target')}</span>
        <input
          className="tx-input"
          type="number"
          min="1"
          step="0.01"
          inputMode="decimal"
          value={form.target}
          onChange={set('target')}
          required
        />
      </label>
      <label className="field">
        <span className="field-label">{t('app.goals.targetDate')}</span>
        <input
          className="tx-input"
          type="date"
          value={form.targetDate}
          onChange={set('targetDate')}
        />
      </label>
      <div className="field">
        <label className="field-label" htmlFor="goal-category">
          {t('app.goals.category')}
        </label>
        <span className="goal-category-field">
          {!form.category && (
            <EmojiPickerButton
              value={form.icon}
              onChange={(icon) => setForm((f) => ({ ...f, icon }))}
            />
          )}
          <select
            id="goal-category"
            className="tx-input"
            value={form.category}
            onChange={set('category')}
          >
            <option value="">{t('app.goals.ownCategory')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.icon} {tCategory(c.name)}
              </option>
            ))}
          </select>
        </span>
      </div>
      <div className="inline-form-actions">
        <button type="submit" className="btn-primary" disabled={saving}>
          {t('app.goals.create')}
        </button>
      </div>
    </form>
  );
}

/** How a goal's date was shown, for the anonymous count (docs/analitica.md). */
function dateDetail(goals: Goal[]): 'real' | 'asked' | 'done' | null {
  const open = goals.filter((g) => !g.archived);
  if (open.some((g) => !g.progress.completed && g.progress.averageMonthly !== null)) return 'real';
  if (open.some((g) => !g.progress.completed)) return 'asked';
  return open.length > 0 ? 'done' : null;
}

/** The current period of the user (their month may start on another day), or this month. */
function useCurrentPeriod(): YearMonth {
  const period = useOptionalSettings()?.settings?.currentPeriod;
  const now = new Date();
  return period
    ? { year: period.year, month: period.month }
    : { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/**
 * Savings goals. Progress comes from SAVING movements recorded in the goal's
 * category, so saving towards a goal is just recording a saving in that category. Each goal
 * says when it is reached at the real pace (or the one the user gives), with a «what if…».
 */
export function GoalsView({ onOpenTab }: { onOpenTab: (tab: DashboardTab) => void }) {
  const { goalApi, insightsApi } = useApi();
  const { t, tCategory } = useI18n();
  const { currency } = useFormat();
  const { categories, refreshCategories } = useFinances();
  const goals = useResource(() => goalApi.getAll(), [goalApi], { initial: [] as Goal[] });
  const action = useAction();
  const [showArchived, setShowArchived] = useState(false);
  const all = goals.data;
  const visible = all.filter((g) => showArchived || !g.archived);
  const reached = all.some((g) => g.progress.completed);
  const current = useCurrentPeriod();
  // What the user decided to cancel in «Tu dinero perdido» can go to a goal (never the rest).
  const leakData = useResource(() => insightsApi.moneyLeaks('goal'), [insightsApi]).data;
  const leaks = useMemo<LeaksForGoal | null>(
    () =>
      leakData
        ? {
            decidedMonthly:
              leakData.reviewed.cancelMonthly + leakData.reviewed.recoveredAnnual / 12,
            pendingMonthly: leakData.total.annual / 12,
          }
        : null,
    [leakData]
  );
  // The date of the goals, seen once per opening of the screen.
  const detail = goals.loading ? null : dateDetail(all);
  const counted = useRef(false);
  useEffect(() => {
    if (!detail || counted.current) return;
    counted.current = true;
    track('goal_date_view', { detail });
  }, [detail]);
  // Reaching a goal is a good moment to ask for a review.
  useEffect(() => {
    if (reached) recordPositiveMoment();
  }, [reached]);

  /** Every goal, archived ones included, with how far along it is. */
  const table = () => {
    const unit = (key: string) => `${t(key)} (${currency})`;
    return {
      head: [
        t('app.goals.export.name'),
        t('app.export.csv.category'),
        unit('app.goals.export.target'),
        unit('app.goals.export.saved'),
        unit('app.goals.export.remaining'),
        t('app.goals.export.percentage'),
        t('app.goals.export.targetDate'),
        unit('app.goals.export.monthly'),
        t('app.accounts.export.archived'),
      ],
      rows: all.map((g) => [
        g.name,
        tCategory(g.categoryName),
        g.target,
        g.progress.saved,
        g.progress.remaining,
        g.progress.percentage,
        g.targetDate,
        g.progress.monthlyNeeded,
        t(g.archived ? 'app.export.csv.yes' : 'app.export.csv.no'),
      ]),
    };
  };

  const run = (change: () => Promise<unknown>) =>
    action.run(async () => {
      await change();
      // A goal without a category creates its own on the server: the lists must know it.
      await Promise.all([goals.reload(), refreshCategories()]);
    });

  return (
    <div className="section-view">
      <div className="card">
        <h2 className="section-title">
          <Icon name="flag" /> {t('app.goals.title')}
        </h2>
        <p className="section-hint">{t('app.goals.hint')}</p>
        <ExportButtons
          name="metas"
          what={t('app.goals.title')}
          count={all.length}
          table={table}
          pdf
        />
        {(action.error ?? goals.error) && (
          <p className="form-error">{action.error ?? goals.error}</p>
        )}
        {!goals.loading && visible.length === 0 && (
          <p className="empty-state">{t('app.goals.empty')}</p>
        )}
        <ul className="goal-list">
          {visible.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              current={current}
              leaks={leaks}
              onOpenTab={onOpenTab}
              onToggleArchive={() => run(() => goalApi.update(g.id, { archived: !g.archived }))}
              onDelete={() => run(() => goalApi.delete(g.id))}
            />
          ))}
        </ul>
        {all.some((g) => g.archived) && (
          <button className="btn-link" onClick={() => setShowArchived((v) => !v)}>
            {t(showArchived ? 'app.goals.hideArchived' : 'app.goals.showArchived')}
          </button>
        )}
      </div>
      <div className="card">
        <h3 className="subsection-title">
          <Icon name="plus" /> {t('app.goals.new')}
        </h3>
        <GoalForm
          categories={categories}
          saving={action.pending}
          onCreate={(input) => run(() => goalApi.create(input))}
        />
      </div>
    </div>
  );
}
