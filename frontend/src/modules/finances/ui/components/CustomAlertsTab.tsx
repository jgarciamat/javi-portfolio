import React, { useState } from 'react';
import { useCustomAlerts, evaluateAlerts } from '../../application/hooks/useCustomAlerts';
import type { AlertEvalInput } from '../../application/hooks/useCustomAlerts';
import { useFinances } from '../../application/FinancesContext';
import { useI18n } from '@core/i18n/I18nContext';
import '../css/CustomAlertsTab.css';
import type { CustomAlert, CreateCustomAlertDTO, UpdateCustomAlertDTO, CustomAlertMetric, CustomAlertOperator, Category } from '@modules/finances/domain/types';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AlertFormState {
    name: string;
    color: string;                 // hex color for the notification banner
    isCategoryAlert: boolean;      // checkbox: alerta sobre categoría
    category: string;              // only used when isCategoryAlert = true
    metric: CustomAlertMetric;
    operator: CustomAlertOperator;
    threshold: string;
}

const DEFAULT_FORM: AlertFormState = {
    name: '',
    color: '#6366f1',
    isCategoryAlert: false,
    category: '',
    metric: 'expenses_pct',
    operator: 'gte',
    threshold: '',
};

// Métricas globales (no necesitan categoría)
const GLOBAL_METRICS: { value: CustomAlertMetric; labelKey: string; unitKey: string }[] = [
    { value: 'expenses_pct', labelKey: 'app.customAlerts.metric.expenses_pct', unitKey: '%' },
    { value: 'saving_pct', labelKey: 'app.customAlerts.metric.saving_pct', unitKey: '%' },
    { value: 'balance_pct', labelKey: 'app.customAlerts.metric.balance_pct', unitKey: '%' },
    { value: 'balance_amount', labelKey: 'app.customAlerts.metric.balance_amount', unitKey: '€' },
    { value: 'income_pct', labelKey: 'app.customAlerts.metric.income_pct', unitKey: '%' },
];

// Métrica de categoría — dos opciones
const CATEGORY_METRICS: { value: CustomAlertMetric; labelKey: string; unitKey: string }[] = [
    { value: 'category_pct', labelKey: 'app.customAlerts.metric.category_pct', unitKey: '%' },
    { value: 'category_amount', labelKey: 'app.customAlerts.metric.category_amount', unitKey: '€' },
];

function unitFor(metric: CustomAlertMetric): string {
    if (metric === 'balance_amount' || metric === 'category_amount') return '€';
    return '%';
}

function metaFor(metric: CustomAlertMetric) {
    const all = [...GLOBAL_METRICS, ...CATEGORY_METRICS];
    return all.find((m) => m.value === metric) ?? GLOBAL_METRICS[0];
}

// ─── Alert form ────────────────────────────────────────────────────────────────

interface AlertFormProps {
    form: AlertFormState;
    onChange: (f: AlertFormState) => void;
    onSubmit: () => void;
    onCancel: () => void;
    loading: boolean;
    error: string | null;
    categories: Category[];
    isEdit: boolean;
}

function AlertForm({ form, onChange, onSubmit, onCancel, loading, error, categories, isEdit }: AlertFormProps) {
    const { t } = useI18n();

    const set = (key: keyof AlertFormState, value: string | boolean) =>
        onChange({ ...form, [key]: value });

    // Cuando el checkbox cambia, resetear a la métrica por defecto del grupo
    const handleCategoryToggle = (checked: boolean) => {
        onChange({
            ...form,
            isCategoryAlert: checked,
            metric: checked ? 'category_pct' : 'expenses_pct',
            category: checked ? form.category : '',
        });
    };

    const availableMetrics = form.isCategoryAlert ? CATEGORY_METRICS : GLOBAL_METRICS;
    const unit = unitFor(form.metric);

    return (
        <div className="ca-form-content">
            <h3 className="ca-form-title">
                {isEdit ? t('app.customAlerts.form.title.edit') : t('app.customAlerts.form.title.create')}
            </h3>

            <div className="ca-form-grid">
                {/* Nombre */}
                <div className="ca-form-field ca-field-name">
                    <label className="ca-label">{t('app.customAlerts.form.name')}</label>
                    <input
                        className="tx-input"
                        placeholder={t('app.customAlerts.form.name.placeholder')}
                        value={form.name}
                        onChange={(e) => set('name', e.target.value)}
                    />
                </div>

                {/* Color picker */}
                <div className="ca-field-color">
                    <label className="ca-label">{t('app.customAlerts.form.color')}</label>
                    <input
                        type="color"
                        className="ca-color-input"
                        value={form.color}
                        onChange={(e) => set('color', e.target.value)}
                        title={t('app.customAlerts.form.color')}
                    />
                </div>

                {/* Checkbox categoría + dropdown */}
                <div className="ca-form-field ca-field-check">
                    <label className="ca-checkbox-row">
                        <input
                            type="checkbox"
                            className="ca-checkbox-input"
                            checked={form.isCategoryAlert}
                            onChange={(e) => handleCategoryToggle(e.target.checked)}
                        />
                        <span className="ca-checkbox-label">{t('app.customAlerts.form.byCategory')}</span>
                    </label>
                </div>

                {form.isCategoryAlert && (
                    <div className="ca-form-field ca-field-cat">
                        <select
                            className="tx-input ca-category-select"
                            value={form.category}
                            onChange={(e) => set('category', e.target.value)}
                        >
                            <option value="">{t('app.customAlerts.form.category.placeholder')}</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Métrica + Condición en la misma fila */}
                <div className="ca-field-metric-op">
                    <div className="ca-form-field">
                        <label className="ca-label">{t('app.customAlerts.form.metric')}</label>
                        <select
                            className="tx-input"
                            value={form.metric}
                            onChange={(e) => set('metric', e.target.value)}
                        >
                            {availableMetrics.map((m) => (
                                <option key={m.value} value={m.value}>{t(m.labelKey)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="ca-form-field">
                        <label className="ca-label">{t('app.customAlerts.form.operator')}</label>
                        <select
                            className="tx-input"
                            value={form.operator}
                            onChange={(e) => set('operator', e.target.value)}
                        >
                            <option value="gte">{t('app.customAlerts.operator.gte')}</option>
                            <option value="lte">{t('app.customAlerts.operator.lte')}</option>
                        </select>
                    </div>
                </div>

                {/* Umbral */}
                <div className="ca-form-field ca-field-thr">
                    <label className="ca-label">
                        {t('app.customAlerts.form.threshold')} ({unit})
                    </label>
                    <input
                        className="tx-input"
                        type="number"
                        min="0"
                        step={unit === '%' ? '1' : '0.01'}
                        placeholder={unit === '%' ? '0' : '0.00'}
                        value={form.threshold}
                        onChange={(e) => set('threshold', e.target.value)}
                    />
                </div>
            </div>

            {error && <p className="ca-form-error">{error}</p>}

            <div className="ca-form-actions">
                <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                    {t('app.customAlerts.form.cancel')}
                </button>
                <button className="btn btn-primary" onClick={onSubmit} disabled={loading}>
                    {loading ? '…' : isEdit ? t('app.customAlerts.form.save') : t('app.customAlerts.form.create')}
                </button>
            </div>
        </div>
    );
}

// ─── Alert card ────────────────────────────────────────────────────────────────

interface AlertCardProps {
    alert: CustomAlert;
    triggered: boolean;
    currentValue: number | null;
    onEdit: (a: CustomAlert) => void;
    onDelete: (id: string) => Promise<void>;
    onToggle: (id: string, active: boolean) => Promise<void>;
}

// ─── Alert card helpers ───────────────────────────────────────────────────────

function formatAlertValue(value: number, unit: string): string {
    if (unit === '%') return `${value.toFixed(1)}%`;
    return `${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function buildCardStyle(triggered: boolean, color: string): React.CSSProperties | undefined {
    if (!triggered) return undefined;
    return { borderColor: `${color}88`, boxShadow: `0 0 0 2px ${color}22` };
}

function AlertCard({ alert, triggered, currentValue, onEdit, onDelete, onToggle }: AlertCardProps) {
    const { t } = useI18n();
    const meta = metaFor(alert.metric);
    const color = alert.color ?? '#6366f1';
    const cardStyle = buildCardStyle(triggered, color);
    const statusClass = alert.active ? ' ca-card-status--active' : ' ca-card-status--inactive';
    const cardClass = `ca-card${triggered ? ' ca-card--triggered' : ''}${!alert.active ? ' ca-card--inactive' : ''}`;
    const metricLabel = t(meta.labelKey);
    const descLabel = alert.category ? `${metricLabel} · ${alert.category}` : metricLabel;

    return (
        <div className={cardClass} style={cardStyle}>
            {/* Header: dot de color + nombre + estado */}
            <div className="ca-card-header">
                <span className="ca-card-color-dot" style={{ background: color }} />
                <span className="ca-card-name" title={alert.name}>{alert.name}</span>
                <span className={`ca-card-status${statusClass}`}>
                    {alert.active ? t('app.customAlerts.card.active') : t('app.customAlerts.card.inactive')}
                </span>
            </div>

            {/* Cuerpo: indicador + umbral */}
            <div className="ca-card-body">
                <p className="ca-card-desc" title={descLabel}>
                    {descLabel}
                </p>
                <p className="ca-card-threshold">
                    {t(`app.customAlerts.operator.${alert.operator}`).toLowerCase()} {formatAlertValue(alert.threshold, meta.unitKey)}
                </p>
            </div>

            {/* Triggered */}
            {triggered && currentValue !== null && (
                <div className="ca-card-triggered-bar" style={{ background: `${color}18` }}>
                    <span className="ca-triggered-label" style={{ color }}>
                        {t('app.customAlerts.triggered')} · {t(meta.labelKey)}: {formatAlertValue(currentValue, meta.unitKey)}
                    </span>
                </div>
            )}

            {/* Acciones */}
            <div className="ca-card-actions">
                <button className="btn-secondary ca-btn-sm" onClick={() => onEdit(alert)}>
                    ✏️ {t('app.customAlerts.edit')}
                </button>
                <button className="btn-secondary ca-btn-sm" onClick={() => onToggle(alert.id, !alert.active)}>
                    {alert.active ? `⏸ ${t('app.customAlerts.pause')}` : `▶ ${t('app.customAlerts.activate')}`}
                </button>
                <button className="btn-danger ca-btn-sm" onClick={() => onDelete(alert.id)}>
                    🗑 {t('app.customAlerts.delete')}
                </button>
            </div>
        </div>
    );
}

// ─── Alert list section ───────────────────────────────────────────────────────

interface AlertListSectionProps {
    alerts: CustomAlert[];
    triggeredIds: Set<string>;
    triggeredMap: Map<string, number>;
    onEdit: (a: CustomAlert) => void;
    onDelete: (id: string) => Promise<void>;
    onToggle: (id: string, active: boolean) => Promise<void>;
    showForm: boolean;
    t: (k: string) => string;
}

function AlertListSection({
    alerts, triggeredIds, triggeredMap,
    onEdit, onDelete, onToggle,
    showForm, t,
}: AlertListSectionProps) {
    if (alerts.length === 0 && !showForm) {
        return (
            <div className="card ca-empty">
                <span className="ca-empty-icon">🔕</span>
                <p className="ca-empty-text">{t('app.customAlerts.empty')}</p>
                <p className="ca-empty-hint">{t('app.customAlerts.empty.hint')}</p>
            </div>
        );
    }
    return (
        <div className="ca-cards-grid">
            {alerts.map((alert) => (
                <AlertCard
                    key={alert.id}
                    alert={alert}
                    triggered={triggeredIds.has(alert.id)}
                    currentValue={triggeredMap.get(alert.id) ?? null}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggle={onToggle}
                />
            ))}
        </div>
    );
}

// ─── Form state hook ──────────────────────────────────────────────────────────

function useAlertFormState(
    createAlert: (dto: CreateCustomAlertDTO) => Promise<CustomAlert>,
    updateAlert: (id: string, dto: UpdateCustomAlertDTO) => Promise<CustomAlert>,
    t: (k: string) => string,
) {
    const [showForm, setShowForm] = useState(false);
    const [editingAlert, setEditingAlert] = useState<CustomAlert | null>(null);
    const [form, setForm] = useState<AlertFormState>(DEFAULT_FORM);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const openCreate = () => {
        setEditingAlert(null);
        setForm(DEFAULT_FORM);
        setFormError(null);
        setShowForm(true);
    };

    const openEdit = (alert: CustomAlert) => {
        setEditingAlert(alert);
        setForm({
            name: alert.name,
            color: alert.color ?? '#6366f1',
            isCategoryAlert: alert.metric === 'category_pct' || alert.metric === 'category_amount',
            metric: alert.metric,
            operator: alert.operator,
            threshold: String(alert.threshold),
            category: alert.category ?? '',
        });
        setFormError(null);
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingAlert(null);
        setForm(DEFAULT_FORM);
        setFormError(null);
    };

    const handleSubmit = async () => {
        const threshold = parseFloat(form.threshold);
        if (!form.name.trim()) { setFormError(t('app.customAlerts.error.nameRequired')); return; }
        if (isNaN(threshold) || threshold < 0) { setFormError(t('app.customAlerts.error.thresholdInvalid')); return; }
        if (form.isCategoryAlert && !form.category) { setFormError(t('app.customAlerts.error.categoryRequired')); return; }

        const dto: CreateCustomAlertDTO = {
            name: form.name.trim(),
            metric: form.metric,
            operator: form.operator,
            threshold,
            category: form.isCategoryAlert ? form.category : null,
            color: form.color,
        };

        setFormLoading(true);
        setFormError(null);
        try {
            if (editingAlert) {
                await updateAlert(editingAlert.id, dto);
            } else {
                await createAlert(dto);
            }
            handleCancel();
        } catch (e) {
            setFormError(e instanceof Error ? e.message : 'Error');
        } finally {
            setFormLoading(false);
        }
    };

    return { showForm, editingAlert, form, setForm, formLoading, formError, openCreate, openEdit, handleCancel, handleSubmit };
}

// ─── Helpers / sub-components ─────────────────────────────────────────────────

function buildEvalInput(
    summary: { totalExpenses: number; totalIncome: number; totalSaving: number; balance: number; expensesByCategory: Record<string, number> } | null,
    carryover: number | null,
): AlertEvalInput {
    return {
        totalExpenses: summary?.totalExpenses ?? 0,
        totalIncome: summary?.totalIncome ?? 0,
        totalSaving: summary?.totalSaving ?? 0,
        balance: summary?.balance ?? 0,
        carryover: carryover ?? 0,
        expensesByCategory: summary?.expensesByCategory ?? {},
    };
}

interface AlertFormSectionProps {
    showForm: boolean;
    editingAlert: CustomAlert | null;
    form: AlertFormState;
    setForm: (f: AlertFormState) => void;
    formLoading: boolean;
    formError: string | null;
    handleSubmit: () => void;
    handleCancel: () => void;
    categories: Category[];
}

function AlertFormSection({ showForm, editingAlert, form, setForm, formLoading, formError, handleSubmit, handleCancel, categories }: AlertFormSectionProps) {
    if (!showForm) return null;
    return (
        <AlertForm
            form={form}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={formLoading}
            error={formError}
            categories={categories}
            isEdit={!!editingAlert}
        />
    );
}
interface AlertBodySectionProps {
    alerts: CustomAlert[];
    loading: boolean;
    error: string | null;
    triggeredIds: Set<string>;
    triggeredMap: Map<string, number>;
    showForm: boolean;
    onEdit: (a: CustomAlert) => void;
    onDelete: (id: string) => Promise<void>;
    onToggle: (id: string, active: boolean) => Promise<void>;
    t: (k: string) => string;
}

function AlertBodySection({ alerts, loading, error, triggeredIds, triggeredMap, showForm, onEdit, onDelete, onToggle, t }: AlertBodySectionProps) {
    if (loading) return <p className="ca-loading">{t('app.customAlerts.loading')}</p>;
    if (error) return <p className="ca-error">{error}</p>;
    return (
        <AlertListSection
            alerts={alerts}
            triggeredIds={triggeredIds}
            triggeredMap={triggeredMap}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
            showForm={showForm}
            t={t}
        />
    );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

interface CustomAlertsTabProps {
    categories: Category[];
}

export function CustomAlertsTab({ categories }: CustomAlertsTabProps) {
    const { t } = useI18n();
    const { alerts, loading, error, createAlert, updateAlert, deleteAlert, toggleActive } = useCustomAlerts();
    const { summary, carryover } = useFinances();

    const formState = useAlertFormState(createAlert, updateAlert, t);
    const { showForm, editingAlert, form, setForm, formLoading, formError, openCreate, openEdit, handleCancel, handleSubmit } = formState;

    const evalInput: AlertEvalInput = buildEvalInput(summary, carryover);
    const triggered = evaluateAlerts(alerts, evalInput);
    const triggeredIds = new Set(triggered.map((tr) => tr.alert.id));
    const triggeredMap = new Map(triggered.map((tr) => [tr.alert.id, tr.currentValue]));

    return (
        <div className="ca-tab">
            {/* Header en tarjeta */}
            <div className="card ca-header-card">
                <div className="ca-tab-header">
                    <div>
                        <h2 className="ca-tab-title">🔔 {t('app.customAlerts.title')}</h2>
                        <p className="ca-tab-subtitle">{t('app.customAlerts.subtitle')}</p>
                    </div>
                    <button className="btn-primary" onClick={openCreate}>
                        {t('app.customAlerts.new')}
                    </button>
                </div>
            </div>
            {/* Formulario en tarjeta */}
            {showForm && (
                <div className="card">
                    <AlertFormSection
                        showForm={showForm}
                        editingAlert={editingAlert}
                        form={form}
                        setForm={setForm}
                        formLoading={formLoading}
                        formError={formError}
                        handleSubmit={handleSubmit}
                        handleCancel={handleCancel}
                        categories={categories}
                    />
                </div>
            )}

            {/* Lista de alertas */}
            <AlertBodySection
                alerts={alerts}
                loading={loading}
                error={error}
                triggeredIds={triggeredIds}
                triggeredMap={triggeredMap}
                showForm={showForm}
                onEdit={openEdit}
                onDelete={deleteAlert}
                onToggle={toggleActive}
                t={t}
            />
        </div>
    );
}
