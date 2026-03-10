import { useState, useRef } from 'react';
import { useRecurringRules } from '../../application/hooks/useRecurringRules';
import { useRecurringRuleForm } from '../../application/hooks/useRecurringRuleForm';
import { useFinances } from '../../application/FinancesContext';
import { useI18n } from '@core/i18n/I18nContext';
import { DeleteRuleModal } from './DeleteRuleModal';
import type { DeleteScope } from './DeleteRuleModal';
import '../css/RecurringRulesTab.css';
import type { RecurringRule, Category } from '@modules/finances/domain/types';
import { TYPE_CLASS } from '../types/RecurringRulesTab.types';
import type { FormState } from '../types/RecurringRulesTab.types';

interface RecurringRulesTabProps {
    categories: Category[];
}

// ─── Date picker helper ───────────────────────────────────────────────────────

interface DatePickerFieldProps {
    value: string;
    onChange: (v: string) => void;
    label?: string;
}

function DatePickerField({ value, onChange, label }: DatePickerFieldProps) {
    const ref = useRef<HTMLInputElement>(null);

    const formatDisplay = (v: string): string => {
        if (!v) return '';
        const [y, m, d] = v.split('-');
        if (!y || !m || !d) return v;
        const date = new Date(Number(y), Number(m) - 1, Number(d));
        return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    };

    return (
        <div
            className="tx-input tx-date-display recurring-date-display"
            onClick={() => ref.current?.showPicker?.()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') ref.current?.showPicker?.(); }}
            aria-label={label}
        >
            <span className="tx-date-icon">📅</span>
            <span>{formatDisplay(value)}</span>
            <input
                ref={ref}
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="tx-date-hidden-input"
                tabIndex={-1}
                aria-hidden="true"
            />
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface RuleFormProps {
    form: FormState;
    onChange: (f: FormState) => void;
    onSubmit: () => void;
    onCancel: () => void;
    loading: boolean;
    error: string | null;
    categories: Category[];
    isEdit: boolean;
}

function RuleForm({ form, onChange, onSubmit, onCancel, loading, error, categories, isEdit }: RuleFormProps) {
    const { t } = useI18n();

    const set = (key: keyof FormState, value: string | boolean) =>
        onChange({ ...form, [key]: value });

    return (
        <div className="recurring-form-panel">
            <h3 className="recurring-form-title">
                {isEdit ? t('app.recurring.form.title.edit') : t('app.recurring.form.title.create')}
            </h3>

            <div className="recurring-form-grid">
                {/* Description */}
                <div className="recurring-form-field recurring-form-field--wide">
                    <label className="recurring-label">{t('app.recurring.form.description')}</label>
                    <input
                        className="tx-input"
                        placeholder={t('app.recurring.form.description')}
                        value={form.description}
                        onChange={(e) => set('description', e.target.value)}
                    />
                </div>

                {/* Amount */}
                <div className="recurring-form-field">
                    <label className="recurring-label">{t('app.recurring.form.amount')}</label>
                    <input
                        className="tx-input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={form.amount}
                        onChange={(e) => set('amount', e.target.value)}
                    />
                </div>

                {/* Type */}
                <div className="recurring-form-field">
                    <label className="recurring-label">{t('app.recurring.form.type')}</label>
                    <select className="tx-input" value={form.type} onChange={(e) => set('type', e.target.value)}>
                        <option value="INCOME">{t('app.recurring.form.type.income')}</option>
                        <option value="EXPENSE">{t('app.recurring.form.type.expense')}</option>
                        <option value="SAVING">{t('app.recurring.form.type.saving')}</option>
                    </select>
                </div>

                {/* Category */}
                <div className="recurring-form-field">
                    <label className="recurring-label">{t('app.recurring.form.category')}</label>
                    <select className="tx-input" value={form.category} onChange={(e) => set('category', e.target.value)}>
                        <option value="">—</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Frequency */}
                <div className="recurring-form-field">
                    <label className="recurring-label">{t('app.recurring.form.frequency')}</label>
                    <select className="tx-input" value={form.frequency} onChange={(e) => set('frequency', e.target.value)}>
                        <option value="monthly">{t('app.recurring.form.frequency.monthly')}</option>
                        <option value="bimonthly">{t('app.recurring.form.frequency.bimonthly')}</option>
                    </select>
                </div>

                {/* Start — styled date picker */}
                <div className="recurring-form-field">
                    <label className="recurring-label">{t('app.recurring.form.start')}</label>
                    <DatePickerField
                        value={form.startDate}
                        onChange={(v) => set('startDate', v)}
                        label={t('app.recurring.form.start')}
                    />
                </div>

                {/* End — radio buttons + native date picker */}
                <div className="recurring-form-field recurring-form-field--wide">
                    <label className="recurring-label">{t('app.recurring.form.end')}</label>
                    <div className="recurring-end-radios">
                        <label className="recurring-radio-label">
                            <input
                                type="radio"
                                name="hasEnd"
                                value="noend"
                                checked={!form.hasEnd}
                                onChange={() => set('hasEnd', false)}
                            />
                            {t('app.recurring.form.end.noend')}
                        </label>
                        <label className="recurring-radio-label">
                            <input
                                type="radio"
                                name="hasEnd"
                                value="withend"
                                checked={form.hasEnd}
                                onChange={() => set('hasEnd', true)}
                            />
                            {t('app.recurring.form.end.withend')}
                        </label>
                    </div>
                    {form.hasEnd && (
                        <DatePickerField
                            value={form.endDate}
                            onChange={(v) => set('endDate', v)}
                            label={t('app.recurring.form.end')}
                        />
                    )}
                </div>
            </div>

            {error && <p className="recurring-error">{error}</p>}

            <div className="tx-form-actions recurring-form-actions">
                <button className="btn-primary" onClick={onSubmit} disabled={loading}>
                    {loading ? t('app.recurring.form.saving') : t('app.recurring.form.save')}
                </button>
                <button className="btn-cancel" onClick={onCancel} disabled={loading}>
                    {t('app.recurring.form.cancel')}
                </button>
            </div>
        </div>
    );
}

interface RuleCardProps {
    rule: RecurringRule;
    onEdit: (rule: RecurringRule) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string, active: boolean) => void;
}

function RuleCard({ rule, onEdit, onDelete, onToggle }: RuleCardProps) {
    const { t } = useI18n();

    return (
        <div className={`recurring-card${rule.active ? '' : ' recurring-card--inactive'}`}>
            <div className="recurring-card-header">
                <span className={`recurring-type-badge ${TYPE_CLASS[rule.type]}`}>
                    {t(`app.recurring.form.type.${rule.type.toLowerCase() as 'income' | 'expense' | 'saving'}`)}
                </span>
                <span className={`recurring-status-badge ${rule.active ? 'recurring-status--active' : 'recurring-status--inactive'}`}>
                    {rule.active ? t('app.recurring.card.active') : t('app.recurring.card.inactive')}
                </span>
            </div>

            <div className="recurring-card-body">
                <p className="recurring-card-description">{rule.description}</p>
                <p className="recurring-card-amount">
                    {rule.type === 'EXPENSE' ? '-' : '+'}{rule.amount.toFixed(2)} €
                </p>
            </div>

            <div className="recurring-card-meta">
                <span className="recurring-meta-item">📁 {rule.category}</span>
                <span className="recurring-meta-item">
                    🔁 {t(`app.recurring.form.frequency.${rule.frequency}`)}
                </span>
                <span className="recurring-meta-item">
                    📅 {t('app.recurring.card.from')} {t(`app.recurring.months.${rule.startMonth}`)} {rule.startYear}
                    {rule.endYear !== null
                        ? ` → ${t(`app.recurring.months.${rule.endMonth}`)} ${rule.endYear}`
                        : ` — ${t('app.recurring.card.forever')}`
                    }
                </span>
            </div>

            <div className="recurring-card-actions">
                <button className="btn-secondary recurring-btn-sm" onClick={() => onEdit(rule)}>
                    ✏️ {t('app.recurring.card.edit')}
                </button>
                <button
                    className="btn-secondary recurring-btn-sm"
                    onClick={() => onToggle(rule.id, !rule.active)}
                >
                    {rule.active ? `⏸ ${t('app.recurring.card.pause')}` : `▶ ${t('app.recurring.card.activate')}`}
                </button>
                <button
                    className="btn-danger recurring-btn-sm"
                    onClick={() => onDelete(rule.id)}
                >
                    🗑 {t('app.recurring.card.delete')}
                </button>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RecurringRulesTab({ categories }: RecurringRulesTabProps) {
    const { t } = useI18n();
    const { rules, loading, error, createRule, updateRule, deleteRule, toggleActive } = useRecurringRules();
    const { refresh } = useFinances();

    const { showForm, editingRule, form, formError, saving, setForm, openCreate, openEdit, closeForm, handleSubmit } =
        useRecurringRuleForm({
            onCreateRule: createRule,
            onUpdateRule: updateRule,
            onAfterSave: () => refresh({ invalidate: true }),
        });

    // ── Delete modal state ──────────────────────────────────────────────────
    const [deletingRule, setDeletingRule] = useState<RecurringRule | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleDeleteConfirm = async (scope: DeleteScope) => {
        if (!deletingRule) return;
        setDeleting(true);
        try {
            await deleteRule(deletingRule.id, scope);
            await refresh({ invalidate: true });
            setDeletingRule(null);
        } catch {
            setDeletingRule(null);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="recurring-tab">
            <div className="card recurring-header-card">
                <div className="recurring-tab-header">
                    <div>
                        <h2 className="recurring-tab-title">⚙️ {t('app.recurring.title')}</h2>
                        <p className="recurring-tab-subtitle">{t('app.recurring.subtitle')}</p>
                    </div>
                    <button className="btn-primary" onClick={openCreate}>
                        {t('app.recurring.new')}
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="card">
                    <RuleForm
                        form={form}
                        onChange={setForm}
                        onSubmit={handleSubmit}
                        onCancel={closeForm}
                        loading={saving}
                        error={formError}
                        categories={categories}
                        isEdit={editingRule !== null}
                    />
                </div>
            )}

            {loading && <p className="recurring-loading">{t('app.loading')}</p>}

            {error && <p className="recurring-error">{error}</p>}

            {!loading && rules.length === 0 && !showForm && (
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
                            onEdit={openEdit}
                            onDelete={(id) => setDeletingRule(rules.find((r) => r.id === id) ?? null)}
                            onToggle={toggleActive}
                        />
                    ))}
                </div>
            )}

            {deletingRule && (
                <DeleteRuleModal
                    ruleName={deletingRule.description}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeletingRule(null)}
                    loading={deleting}
                />
            )}
        </div>
    );
}
