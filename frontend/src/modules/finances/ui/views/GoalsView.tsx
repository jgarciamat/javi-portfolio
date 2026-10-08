import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { useAction } from '@shared/hooks/useAction';
import { useResource } from '@shared/hooks/useResource';
import { parseDecimal } from '@shared/utils/numbers';
import type { Category, Goal, GoalInput } from '@modules/finances/domain/types';
import { useFinances } from '../../application/FinancesContext';
import '../css/Sections.css';

function GoalCard({
  goal,
  onToggleArchive,
  onDelete,
}: {
  goal: Goal;
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
        {goal.targetDate && <span>📅 {date(goal.targetDate)}</span>}
        {progress.monthlyNeeded !== null && !progress.completed && (
          <span>{t('app.goals.monthlyNeeded', { amount: money(progress.monthlyNeeded) })}</span>
        )}
      </div>
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
          🗑️
        </button>
      </div>
    </li>
  );
}

const EMPTY_GOAL = { name: '', target: '', targetDate: '', category: '' };

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
        });
        if (created) setForm(EMPTY_GOAL);
      }}
    >
      <input
        className="tx-input"
        placeholder={t('app.goals.name')}
        aria-label={t('app.goals.name')}
        value={form.name}
        onChange={set('name')}
        maxLength={80}
        required
      />
      <input
        className="tx-input"
        type="number"
        min="1"
        step="0.01"
        inputMode="decimal"
        placeholder={t('app.goals.target')}
        aria-label={t('app.goals.target')}
        value={form.target}
        onChange={set('target')}
        required
      />
      <label className="field">
        <span className="field-label">{t('app.goals.targetDate')}</span>
        <input
          className="tx-input"
          type="date"
          value={form.targetDate}
          onChange={set('targetDate')}
        />
      </label>
      <label className="field">
        <span className="field-label">{t('app.goals.category')}</span>
        <select className="tx-input" value={form.category} onChange={set('category')}>
          <option value="">{t('app.goals.ownCategory')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.icon} {tCategory(c.name)}
            </option>
          ))}
        </select>
      </label>
      <div className="inline-form-actions">
        <button type="submit" className="btn-primary" disabled={saving}>
          {t('app.goals.create')}
        </button>
      </div>
    </form>
  );
}

/**
 * Savings goals. Progress comes from SAVING movements recorded in the goal's
 * category, so saving towards a goal is just recording a saving in that category.
 */
export function GoalsView() {
  const { goalApi } = useApi();
  const { t } = useI18n();
  const { categories } = useFinances();
  const goals = useResource(() => goalApi.getAll(), [goalApi], { initial: [] as Goal[] });
  const action = useAction();
  const [showArchived, setShowArchived] = useState(false);
  const all = goals.data;
  const visible = all.filter((g) => showArchived || !g.archived);

  const run = (change: () => Promise<unknown>) =>
    action.run(async () => {
      await change();
      await goals.reload();
    });

  return (
    <div className="section-view">
      <div className="card">
        <h2 className="section-title">🏁 {t('app.goals.title')}</h2>
        <p className="section-hint">{t('app.goals.hint')}</p>
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
        <h3 className="subsection-title">➕ {t('app.goals.new')}</h3>
        <GoalForm
          categories={categories}
          saving={action.pending}
          onCreate={(input) => run(() => goalApi.create(input))}
        />
      </div>
    </div>
  );
}
