import { useId, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { DateField } from '@shared/components/DateField';
import { useAction } from '@shared/hooks/useAction';
import type { Category, RecurringRule, TransactionType } from '@modules/finances/domain/types';
import { FREQUENCIES, type RuleFormState } from '@modules/finances/domain/recurringForm';
import { TRANSACTION_TYPES } from '@modules/finances/domain/transactionTypes';
import { useRecurringRules } from '../../application/hooks/useRecurringRules';
import { useRecurringRuleForm } from '../../application/hooks/useRecurringRuleForm';
import { useFinances } from '../../application/FinancesContext';
import { DeleteRuleModal, type DeleteScope } from './DeleteRuleModal';
import '../css/RecurringRulesTab.css';

const TYPE_CLASS: Record<TransactionType, string> = {
  INCOME: 'recurring-type--income',
  EXPENSE: 'recurring-type--expense',
  SAVING: 'recurring-type--saving',
};

const typeKey = (type: TransactionType) => `app.recurring.form.type.${type.toLowerCase()}`;

// ─── Form ─────────────────────────────────────────────────────────────────────

type SetField = <K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) => void;

/** "No end" / "Ends on" with its date. */
function EndDateFields({ form, set, name }: { form: RuleFormState; set: SetField; name: string }) {
  const { t } = useI18n();
  return (
    <fieldset className="recurring-form-field recurring-form-field--wide recurring-fieldset">
      <legend className="recurring-label">{t('app.recurring.form.end')}</legend>
      <div className="recurring-end-radios">
        <label className="recurring-radio-label">
          <input
            type="radio"
            name={name}
            checked={!form.hasEnd}
            onChange={() => set('hasEnd', false)}
          />
          {t('app.recurring.form.end.noend')}
        </label>
        <label className="recurring-radio-label">
          <input
            type="radio"
            name={name}
            checked={form.hasEnd}
            onChange={() => set('hasEnd', true)}
          />
          {t('app.recurring.form.end.withend')}
        </label>
      </div>
      {form.hasEnd && (
        <DateField
          value={form.endDate}
          onChange={(v) => set('endDate', v)}
          label={t('app.recurring.form.end')}
          className="recurring-date-display"
        />
      )}
    </fieldset>
  );
}

interface RuleFormProps {
  form: RuleFormState;
  onChange: (form: RuleFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
  categories: Category[];
  isEdit: boolean;
}

function RuleForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  loading,
  error,
  categories,
  isEdit,
}: RuleFormProps) {
  const { t, tCategory } = useI18n();
  const id = useId();
  const set: SetField = (key, value) => onChange({ ...form, [key]: value });

  return (
    <form
      className="recurring-form-panel"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <h3 className="recurring-form-title">
        {t(isEdit ? 'app.recurring.form.title.edit' : 'app.recurring.form.title.create')}
      </h3>

      <div className="recurring-form-grid">
        <div className="recurring-form-field recurring-form-field--wide">
          <label className="recurring-label" htmlFor={`${id}-description`}>
            {t('app.recurring.form.description')}
          </label>
          <input
            id={`${id}-description`}
            className="tx-input"
            placeholder={t('app.recurring.form.description')}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        <div className="recurring-form-field">
          <label className="recurring-label" htmlFor={`${id}-amount`}>
            {t('app.recurring.form.amount')}
          </label>
          <input
            id={`${id}-amount`}
            className="tx-input"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
          />
        </div>

        <div className="recurring-form-field">
          <label className="recurring-label" htmlFor={`${id}-type`}>
            {t('app.recurring.form.type')}
          </label>
          <select
            id={`${id}-type`}
            className="tx-input"
            value={form.type}
            onChange={(e) => set('type', e.target.value as TransactionType)}
          >
            {TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(typeKey(type))}
              </option>
            ))}
          </select>
        </div>

        <div className="recurring-form-field">
          <label className="recurring-label" htmlFor={`${id}-category`}>
            {t('app.recurring.form.category')}
          </label>
          <select
            id={`${id}-category`}
            className="tx-input"
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.icon} {tCategory(c.name)}
              </option>
            ))}
          </select>
        </div>

        <div className="recurring-form-field">
          <label className="recurring-label" htmlFor={`${id}-frequency`}>
            {t('app.recurring.form.frequency')}
          </label>
          <select
            id={`${id}-frequency`}
            className="tx-input"
            value={form.frequency}
            onChange={(e) => set('frequency', e.target.value as RuleFormState['frequency'])}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {t(`app.recurring.form.frequency.${f}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="recurring-form-field">
          <span className="recurring-label">{t('app.recurring.form.start')}</span>
          <DateField
            value={form.startDate}
            onChange={(v) => set('startDate', v)}
            label={t('app.recurring.form.start')}
            className="recurring-date-display"
          />
        </div>

        <EndDateFields form={form} set={set} name={`${id}-end`} />
      </div>

      {error && <p className="recurring-error">{t(error)}</p>}

      <div className="tx-form-actions recurring-form-actions">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? t('app.recurring.form.saving') : t('app.recurring.form.save')}
        </button>
        <button type="button" className="btn-cancel" onClick={onCancel} disabled={loading}>
          {t('app.recurring.form.cancel')}
        </button>
      </div>
    </form>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface RuleCardProps {
  rule: RecurringRule;
  onEdit: (rule: RecurringRule) => void;
  onDelete: (rule: RecurringRule) => void;
  onToggle: (rule: RecurringRule) => void;
}

function RuleCard({ rule, onEdit, onDelete, onToggle }: RuleCardProps) {
  const { t, tCategory } = useI18n();
  const { money, monthName } = useFormat();
  const period = (year: number, month: number) => `${monthName(month, 'short')} ${year}`;
  const toggleLabel = t(rule.active ? 'app.recurring.card.pause' : 'app.recurring.card.activate');

  return (
    <div className={`recurring-card${rule.active ? '' : ' recurring-card--inactive'}`}>
      <div className="recurring-card-header">
        <span className={`recurring-type-badge ${TYPE_CLASS[rule.type]}`}>
          {t(typeKey(rule.type))}
        </span>
        <span
          className={`recurring-status-badge recurring-status--${
            rule.active ? 'active' : 'inactive'
          }`}
        >
          {t(rule.active ? 'app.recurring.card.active' : 'app.recurring.card.inactive')}
        </span>
      </div>

      <div className="recurring-card-body">
        <p className="recurring-card-description">{rule.description}</p>
        <p className="recurring-card-amount">
          {rule.type === 'EXPENSE' ? '-' : '+'}
          {money(rule.amount)}
        </p>
      </div>

      <div className="recurring-card-meta">
        <span className="recurring-meta-item">📁 {tCategory(rule.category)}</span>
        <span className="recurring-meta-item">
          🔁 {t(`app.recurring.form.frequency.${rule.frequency}`)}
        </span>
        <span className="recurring-meta-item">
          📅 {t('app.recurring.card.from')} {period(rule.startYear, rule.startMonth)}
          {rule.endYear !== null && rule.endMonth !== null
            ? ` → ${period(rule.endYear, rule.endMonth)}`
            : ` — ${t('app.recurring.card.forever')}`}
        </span>
      </div>

      <div className="recurring-card-actions">
        <button
          className="btn-secondary recurring-btn-sm"
          onClick={() => onEdit(rule)}
          aria-label={`${t('app.recurring.card.edit')}: ${rule.description}`}
        >
          ✏️ {t('app.recurring.card.edit')}
        </button>
        <button
          className="btn-secondary recurring-btn-sm"
          onClick={() => onToggle(rule)}
          aria-label={`${toggleLabel}: ${rule.description}`}
        >
          {rule.active ? '⏸' : '▶'} {toggleLabel}
        </button>
        <button
          className="btn-danger recurring-btn-sm"
          onClick={() => onDelete(rule)}
          aria-label={`${t('app.recurring.card.delete')}: ${rule.description}`}
        >
          🗑 {t('app.recurring.card.delete')}
        </button>
      </div>
    </div>
  );
}

// ─── Tab ──────────────────────────────────────────────────────────────────────

export function RecurringRulesTab({ categories }: { categories: Category[] }) {
  const { t } = useI18n();
  const { rules, loading, error, createRule, updateRule, deleteRule, toggleActive } =
    useRecurringRules();
  const { refresh } = useFinances();
  const reloadMonths = () => refresh({ invalidate: true });
  const editor = useRecurringRuleForm({
    onCreateRule: createRule,
    onUpdateRule: updateRule,
    onAfterSave: reloadMonths,
  });
  const [deleting, setDeleting] = useState<RecurringRule | null>(null);
  const deletion = useAction();
  const toggling = useAction();

  const confirmDelete = async (rule: RecurringRule, scope: DeleteScope) => {
    const ok = await deletion.run(async () => {
      await deleteRule(rule.id, scope);
      await reloadMonths();
    });
    if (ok) setDeleting(null);
  };

  const listError = error ?? toggling.error;

  return (
    <div className="recurring-tab">
      <div className="card recurring-header-card">
        <div className="recurring-tab-header">
          <div>
            <h2 className="recurring-tab-title">⚙️ {t('app.recurring.title')}</h2>
            <p className="recurring-tab-subtitle">{t('app.recurring.subtitle')}</p>
          </div>
          <button className="btn-primary" onClick={editor.openCreate}>
            {t('app.recurring.new')}
          </button>
        </div>
      </div>

      {editor.showForm && (
        <div className="card">
          <RuleForm
            form={editor.form}
            onChange={editor.setForm}
            onSubmit={editor.handleSubmit}
            onCancel={editor.closeForm}
            loading={editor.saving}
            error={editor.formError}
            categories={categories}
            isEdit={editor.editingRule !== null}
          />
        </div>
      )}

      {loading && <p className="recurring-loading">{t('app.loading')}</p>}
      {listError && <p className="recurring-error">{listError}</p>}

      {!loading && rules.length === 0 && !editor.showForm && (
        <div className="card recurring-empty">
          <p className="recurring-empty-title">🔄 {t('app.recurring.empty')}</p>
          <p className="recurring-empty-hint">{t('app.recurring.empty.hint')}</p>
        </div>
      )}

      {rules.length > 0 && (
        <div className="recurring-cards-grid">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={editor.openEdit}
              onDelete={(r) => {
                deletion.setError(null);
                setDeleting(r);
              }}
              onToggle={(r) =>
                toggling.run(async () => {
                  await toggleActive(r.id, !r.active);
                  await reloadMonths();
                })
              }
            />
          ))}
        </div>
      )}

      {deleting && (
        <DeleteRuleModal
          ruleName={deleting.description}
          onConfirm={(scope) => confirmDelete(deleting, scope)}
          onCancel={() => setDeleting(null)}
          loading={deletion.pending}
          error={deletion.error}
        />
      )}
    </div>
  );
}
