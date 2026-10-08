import { useId, useMemo } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { useAction } from '@shared/hooks/useAction';
import type { Category, CustomAlert } from '@modules/finances/domain/types';
import {
  ALERT_METRICS,
  ALERT_OPERATORS,
  alertInput,
  evaluateAlerts,
  metricMeta,
} from '@modules/finances/domain/customAlerts';
import { useCustomAlerts } from '../../application/CustomAlertsContext';
import { useFinances } from '../../application/FinancesContext';
import {
  DEFAULT_ALERT_COLOR,
  useAlertForm,
  withCategoryMode,
  type AlertFormState,
} from '../../application/hooks/useAlertForm';
import { formatMetricValue } from './alertFormat';
import '../css/CustomAlertsTab.css';

// ─── Form ─────────────────────────────────────────────────────────────────────

interface AlertFormProps {
  form: AlertFormState;
  onChange: (form: AlertFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  categories: Category[];
  isEdit: boolean;
}

function AlertForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  saving,
  error,
  categories,
  isEdit,
}: AlertFormProps) {
  const { t, tCategory } = useI18n();
  const { currency } = useFormat();
  const id = useId();
  const set = <K extends keyof AlertFormState>(key: K, value: AlertFormState[K]) =>
    onChange({ ...form, [key]: value });
  const metrics = ALERT_METRICS.filter((m) => m.byCategory === form.byCategory);
  const percent = metricMeta(form.metric).unit === 'percent';

  return (
    <form
      className="ca-form-content"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <h3 className="ca-form-title">
        {t(isEdit ? 'app.customAlerts.form.title.edit' : 'app.customAlerts.form.title.create')}
      </h3>
      <div className="ca-form-grid">
        <div className="ca-form-field ca-field-name">
          <label className="ca-label" htmlFor={`${id}-name`}>
            {t('app.customAlerts.form.name')}
          </label>
          <input
            id={`${id}-name`}
            className="tx-input"
            placeholder={t('app.customAlerts.form.name.placeholder')}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </div>

        <div className="ca-field-color">
          <label className="ca-label" htmlFor={`${id}-color`}>
            {t('app.customAlerts.form.color')}
          </label>
          <input
            id={`${id}-color`}
            type="color"
            className="ca-color-input"
            value={form.color}
            onChange={(e) => set('color', e.target.value)}
          />
        </div>

        <div className="ca-form-field ca-field-check">
          <label className="ca-checkbox-row">
            <input
              type="checkbox"
              className="ca-checkbox-input"
              checked={form.byCategory}
              onChange={(e) => onChange(withCategoryMode(form, e.target.checked))}
            />
            <span className="ca-checkbox-label">{t('app.customAlerts.form.byCategory')}</span>
          </label>
        </div>

        {form.byCategory && (
          <div className="ca-form-field ca-field-cat">
            <select
              className="tx-input ca-category-select"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              aria-label={t('app.customAlerts.form.category.placeholder')}
            >
              <option value="">{t('app.customAlerts.form.category.placeholder')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.icon} {tCategory(c.name)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="ca-field-metric-op">
          <div className="ca-form-field">
            <label className="ca-label" htmlFor={`${id}-metric`}>
              {t('app.customAlerts.form.metric')}
            </label>
            <select
              id={`${id}-metric`}
              className="tx-input"
              value={form.metric}
              onChange={(e) => set('metric', e.target.value as AlertFormState['metric'])}
            >
              {metrics.map((m) => (
                <option key={m.value} value={m.value}>
                  {t(m.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <div className="ca-form-field">
            <label className="ca-label" htmlFor={`${id}-operator`}>
              {t('app.customAlerts.form.operator')}
            </label>
            <select
              id={`${id}-operator`}
              className="tx-input"
              value={form.operator}
              onChange={(e) => set('operator', e.target.value as AlertFormState['operator'])}
            >
              {ALERT_OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {t(`app.customAlerts.operator.${op}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ca-form-field ca-field-thr">
          <label className="ca-label" htmlFor={`${id}-threshold`}>
            {t('app.customAlerts.form.threshold')} ({percent ? '%' : currency})
          </label>
          <input
            id={`${id}-threshold`}
            className="tx-input"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder={percent ? '0' : '0.00'}
            value={form.threshold}
            onChange={(e) => set('threshold', e.target.value)}
          />
        </div>
      </div>

      {error && <p className="ca-form-error">{t(error)}</p>}

      <div className="ca-form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          {t('app.customAlerts.form.cancel')}
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? '…' : t(isEdit ? 'app.customAlerts.form.save' : 'app.customAlerts.form.create')}
        </button>
      </div>
    </form>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface AlertCardProps {
  alert: CustomAlert;
  /** Value that triggers the alert this month, or null when it does not fire. */
  currentValue: number | null;
  onEdit: (alert: CustomAlert) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}

function AlertCard({ alert, currentValue, onEdit, onDelete, onToggle }: AlertCardProps) {
  const { t, tCategory } = useI18n();
  const format = useFormat();
  const meta = metricMeta(alert.metric);
  const color = alert.color || DEFAULT_ALERT_COLOR;
  const triggered = currentValue !== null;
  const metricLabel = t(meta.labelKey);
  const description = alert.category
    ? `${metricLabel} · ${tCategory(alert.category)}`
    : metricLabel;
  const classes = [
    'ca-card',
    triggered && 'ca-card--triggered',
    !alert.active && 'ca-card--inactive',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      style={
        triggered ? { borderColor: `${color}88`, boxShadow: `0 0 0 2px ${color}22` } : undefined
      }
    >
      <div className="ca-card-header">
        <span className="ca-card-color-dot" style={{ background: color }} />
        <span className="ca-card-name" title={alert.name}>
          {alert.name}
        </span>
        <span className={`ca-card-status ca-card-status--${alert.active ? 'active' : 'inactive'}`}>
          {t(alert.active ? 'app.customAlerts.card.active' : 'app.customAlerts.card.inactive')}
        </span>
      </div>

      <div className="ca-card-body">
        <p className="ca-card-desc" title={description}>
          {description}
        </p>
        <p className="ca-card-threshold">
          {t(`app.customAlerts.operator.${alert.operator}`).toLowerCase()}{' '}
          {formatMetricValue(format, meta.unit, alert.threshold)}
        </p>
      </div>

      {triggered && (
        <div className="ca-card-triggered-bar" style={{ background: `${color}18` }}>
          <span className="ca-triggered-label" style={{ color }}>
            {t('app.customAlerts.triggered')} · {metricLabel}:{' '}
            {formatMetricValue(format, meta.unit, currentValue)}
          </span>
        </div>
      )}

      <div className="ca-card-actions">
        <button className="btn-secondary ca-btn-sm" onClick={() => onEdit(alert)}>
          ✏️ {t('app.customAlerts.edit')}
        </button>
        <button
          className="btn-secondary ca-btn-sm"
          onClick={() => onToggle(alert.id, !alert.active)}
        >
          {alert.active
            ? `⏸ ${t('app.customAlerts.pause')}`
            : `▶ ${t('app.customAlerts.activate')}`}
        </button>
        <button className="btn-danger ca-btn-sm" onClick={() => onDelete(alert.id)}>
          🗑 {t('app.customAlerts.delete')}
        </button>
      </div>
    </div>
  );
}

// ─── Tab ──────────────────────────────────────────────────────────────────────

function AlertList({
  onEdit,
  showEmpty,
}: {
  onEdit: (alert: CustomAlert) => void;
  /** The empty state is hidden while the form is open. */
  showEmpty: boolean;
}) {
  const { t } = useI18n();
  const { alerts, loading, error, deleteAlert, toggleActive } = useCustomAlerts();
  const { summary, carryover } = useFinances();
  const cardAction = useAction();
  const firing = useMemo(
    () =>
      new Map(
        evaluateAlerts(alerts, alertInput(summary, carryover)).map((tr) => [
          tr.alert.id,
          tr.currentValue,
        ])
      ),
    [alerts, summary, carryover]
  );
  const shownError = error ?? cardAction.error;

  if (loading) return <p className="ca-loading">{t('app.customAlerts.loading')}</p>;
  return (
    <>
      {shownError && <p className="ca-error">{shownError}</p>}
      {alerts.length === 0 && showEmpty && !error && (
        <div className="card ca-empty">
          <span className="ca-empty-icon">🔕</span>
          <p className="ca-empty-text">{t('app.customAlerts.empty')}</p>
          <p className="ca-empty-hint">{t('app.customAlerts.empty.hint')}</p>
        </div>
      )}
      {alerts.length > 0 && (
        <div className="ca-cards-grid">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              currentValue={firing.get(alert.id) ?? null}
              onEdit={onEdit}
              onDelete={(id) => cardAction.run(() => deleteAlert(id))}
              onToggle={(id, active) => cardAction.run(() => toggleActive(id, active))}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function CustomAlertsTab({ categories }: { categories: Category[] }) {
  const { t } = useI18n();
  const { createAlert, updateAlert } = useCustomAlerts();
  const editor = useAlertForm(createAlert, updateAlert);

  return (
    <div className="ca-tab">
      <div className="card ca-header-card">
        <div className="ca-tab-header">
          <div>
            <h2 className="ca-tab-title">🔔 {t('app.customAlerts.title')}</h2>
            <p className="ca-tab-subtitle">{t('app.customAlerts.subtitle')}</p>
          </div>
          <button className="btn-primary" onClick={editor.openCreate}>
            {t('app.customAlerts.new')}
          </button>
        </div>
      </div>

      {editor.open && (
        <div className="card">
          <AlertForm
            form={editor.form}
            onChange={editor.setForm}
            onSubmit={editor.submit}
            onCancel={editor.close}
            saving={editor.saving}
            error={editor.error}
            categories={categories}
            isEdit={editor.editing !== null}
          />
        </div>
      )}

      <AlertList onEdit={editor.openEdit} showEmpty={!editor.open} />
    </div>
  );
}
