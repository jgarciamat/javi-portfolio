import { useState } from 'react';
import { useRecurringRules } from '../../application/hooks/useRecurringRules';
import { useI18n } from '@core/i18n/I18nContext';
import '../css/RecurringRulesTab.css';
import type { RecurringRule, CreateRecurringRuleDTO, UpdateRecurringRuleDTO, RecurringFrequency, TransactionType, Category } from '@modules/finances/domain/types';

interface RecurringRulesTabProps {
    categories: Category[];
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
    description: string;
    amount: string;
    type: TransactionType;
    category: string;
    frequency: RecurringFrequency;
    startYear: string;
    startMonth: string;
    hasEnd: boolean;
    endYear: string;
    endMonth: string;
}

const now = new Date();
const EMPTY_FORM: FormState = {
    description: '',
    amount: '',
    type: 'EXPENSE',
    category: '',
    frequency: 'monthly',
    startYear: String(now.getFullYear()),
    startMonth: String(now.getMonth() + 1),
    hasEnd: false,
    endYear: '',
    endMonth: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ruleToForm(rule: RecurringRule): FormState {
    return {
        description: rule.description,
        amount: String(rule.amount),
        type: rule.type,
        category: rule.category,
        frequency: rule.frequency,
        startYear: String(rule.startYear),
        startMonth: String(rule.startMonth),
        hasEnd: rule.endYear !== null,
        endYear: rule.endYear !== null ? String(rule.endYear) : '',
        endMonth: rule.endMonth !== null ? String(rule.endMonth) : '',
    };
}

function validateForm(form: FormState, amount: number): string | null {
    if (!form.description.trim()) return 'La descripción es obligatoria';
    if (isNaN(amount) || amount <= 0) return 'El importe debe ser un número positivo';
    if (!form.category) return 'Selecciona una categoría';
    return null;
}

function buildDto(form: FormState, amount: number): CreateRecurringRuleDTO {
    return {
        description: form.description.trim(),
        amount,
        type: form.type,
        category: form.category,
        frequency: form.frequency,
        startYear: parseInt(form.startYear, 10),
        startMonth: parseInt(form.startMonth, 10),
        endYear: form.hasEnd && form.endYear ? parseInt(form.endYear, 10) : null,
        endMonth: form.hasEnd && form.endMonth ? parseInt(form.endMonth, 10) : null,
    };
}

const TYPE_ICON: Record<TransactionType, string> = {
    INCOME: '↑',
    EXPENSE: '↓',
    SAVING: '↑',
};

const TYPE_CLASS: Record<TransactionType, string> = {
    INCOME: 'recurring-type--income',
    EXPENSE: 'recurring-type--expense',
    SAVING: 'recurring-type--saving',
};

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

                {/* Start */}
                <div className="recurring-form-field">
                    <label className="recurring-label">{t('app.recurring.form.start')}</label>
                    <div className="recurring-date-row">
                        <select className="tx-input" value={form.startMonth} onChange={(e) => set('startMonth', e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{t(`app.recurring.months.${i + 1}`)}</option>
                            ))}
                        </select>
                        <input
                            className="tx-input recurring-year-input"
                            type="number"
                            min="2020"
                            max="2099"
                            value={form.startYear}
                            onChange={(e) => set('startYear', e.target.value)}
                        />
                    </div>
                </div>

                {/* End toggle + date */}
                <div className="recurring-form-field recurring-form-field--wide">
                    <label className="recurring-label">{t('app.recurring.form.end')}</label>
                    <label className="tx-done-label recurring-end-toggle">
                        <input type="checkbox" checked={form.hasEnd} onChange={(e) => set('hasEnd', e.target.checked)} />
                        {form.hasEnd ? t('app.recurring.card.to') : t('app.recurring.form.end.forever')}
                    </label>
                    {form.hasEnd && (
                        <div className="recurring-date-row">
                            <select className="tx-input" value={form.endMonth} onChange={(e) => set('endMonth', e.target.value)}>
                                <option value="">—</option>
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>{t(`app.recurring.months.${i + 1}`)}</option>
                                ))}
                            </select>
                            <input
                                className="tx-input recurring-year-input"
                                type="number"
                                min="2020"
                                max="2099"
                                value={form.endYear}
                                onChange={(e) => set('endYear', e.target.value)}
                            />
                        </div>
                    )}
                    {!form.hasEnd && <p className="recurring-hint">{t('app.recurring.form.end.hint')}</p>}
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
                    {TYPE_ICON[rule.type]} {t(`app.recurring.form.type.${rule.type.toLowerCase() as 'income' | 'expense' | 'saving'}`)}
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
                    onClick={() => { if (window.confirm(t('app.recurring.delete.confirm'))) onDelete(rule.id); }}
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

    const [showForm, setShowForm] = useState(false);
    const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const openCreate = () => {
        setEditingRule(null);
        setForm(EMPTY_FORM);
        setFormError(null);
        setShowForm(true);
    };

    const openEdit = (rule: RecurringRule) => {
        setEditingRule(rule);
        setForm(ruleToForm(rule));
        setFormError(null);
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingRule(null);
    };

    const handleSubmit = async () => {
        const amount = parseFloat(form.amount);
        const validationError = validateForm(form, amount);
        if (validationError) { setFormError(validationError); return; }

        const dto = buildDto(form, amount);

        setSaving(true);
        setFormError(null);
        try {
            if (editingRule) {
                await updateRule(editingRule.id, dto as UpdateRecurringRuleDTO);
            } else {
                await createRule(dto);
            }
            closeForm();
        } catch (e) {
            setFormError(e instanceof Error ? e.message : 'Error al guardar');
        } finally {
            setSaving(false);
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
                            onDelete={deleteRule}
                            onToggle={toggleActive}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
