import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { parseDecimal } from '@shared/utils/numbers';
import type { Account, AssetKind, DebtType } from '../../domain/types';
import {
  ASSET_GROUPS,
  DEBT_TYPES,
  GOOD_KINDS,
  assetFormResult,
  emptyAssetForm,
  type AssetForm as Form,
  type CreateAssetInput,
} from '../../domain/assetForm';
import { DebtPaymentFields } from './DebtPaymentFields';

type SetField = <K extends keyof Form>(key: K, value: Form[K]) => void;

/** Step 1: a good, an investment or a debt. */
function GroupStep({ form, set }: { form: Form; set: SetField }) {
  const { t } = useI18n();
  return (
    <fieldset className="asset-step">
      <legend className="asset-step-title">{t('app.assets.step.what')}</legend>
      <div className="asset-groups">
        {ASSET_GROUPS.map((g) => (
          <label key={g} className={`asset-group${form.group === g ? ' is-on' : ''}`}>
            <input
              type="radio"
              name="asset-group"
              value={g}
              checked={form.group === g}
              onChange={() => set('group', g)}
            />
            <strong>{t(`app.assets.group.${g}`)}</strong>
            <small>{t(`app.assets.group.${g}.hint`)}</small>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A select of the kinds of goods or of debts. */
function KindSelect<T extends string>({
  label,
  value,
  options,
  prefix,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  prefix: string;
  onChange: (value: T) => void;
}) {
  const { t } = useI18n();
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className="tx-input" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((k) => (
          <option key={k} value={k}>
            {t(`${prefix}.${k}`)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** A text field of the form. */
function TextField({
  label,
  value,
  onChange,
  decimal = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  decimal?: boolean;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="tx-input"
        inputMode={decimal ? 'decimal' : undefined}
        maxLength={decimal ? undefined : 60}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Step 2: its kind, name and value (for a debt, what is owed and, optionally, more). */
function DataStep({ form, set }: { form: Form; set: SetField }) {
  const { t } = useI18n();
  const isDebt = form.group === 'debt';
  return (
    <fieldset className="asset-step">
      <legend className="asset-step-title">{t('app.assets.step.data')}</legend>
      <div className="form-grid">
        {form.group === 'good' && (
          <KindSelect<AssetKind>
            label={t('app.assets.kind')}
            value={form.goodKind}
            options={GOOD_KINDS}
            prefix="app.assets.kind"
            onChange={(v) => set('goodKind', v)}
          />
        )}
        {isDebt && (
          <KindSelect<DebtType>
            label={t('app.assets.debtType')}
            value={form.debtType}
            options={DEBT_TYPES}
            prefix="app.assets.debtType"
            onChange={(v) => set('debtType', v)}
          />
        )}
        <TextField
          label={t('app.assets.name')}
          value={form.name}
          onChange={(v) => set('name', v)}
        />
        <TextField
          label={t(isDebt ? 'app.assets.owed' : 'app.assets.value')}
          value={form.value}
          onChange={(v) => set('value', v)}
          decimal
        />
      </div>
      {isDebt && (
        <>
          <p className="section-hint">{t('app.assets.debtSubtracts')}</p>
          <h4 className="asset-substep">{t('app.assets.more')}</h4>
          <div className="form-grid">
            <TextField
              label={t('app.assets.initial')}
              value={form.initial}
              onChange={(v) => set('initial', v)}
              decimal
            />
            <TextField
              label={t('app.assets.rate')}
              value={form.rate}
              onChange={(v) => set('rate', v)}
              decimal
            />
          </div>
        </>
      )}
    </fieldset>
  );
}

/** Step 3 (debts): a payment every month that lowers it by itself. */
function PaymentStep({ form, set, accounts }: { form: Form; set: SetField; accounts: Account[] }) {
  const { t } = useI18n();
  const rate = parseDecimal(form.rate);
  return (
    <fieldset className="asset-step">
      <legend className="asset-step-title">{t('app.assets.step.pay')}</legend>
      <label className="asset-pays">
        <input
          type="checkbox"
          checked={form.pays}
          onChange={(e) => set('pays', e.target.checked)}
        />
        {t('app.assets.pays')}
      </label>
      {form.pays && (
        <DebtPaymentFields
          form={form.payment}
          onChange={(payment) => set('payment', payment)}
          accounts={accounts}
          owed={parseDecimal(form.value)}
          rate={Number.isFinite(rate) ? rate : null}
          withStart
        />
      )}
    </fieldset>
  );
}

interface Props {
  accounts: Account[];
  pending: boolean;
  /** Resolves true when it was added (the form starts again). */
  onAdd: (input: CreateAssetInput) => Promise<boolean>;
}

/**
 * Adding an element in clear steps: what it is (a good, an investment or a debt), its data and,
 * for a debt, how it is paid every month (it then lowers by itself).
 */
export function AssetForm({ accounts, pending, onAdd }: Props) {
  const { t } = useI18n();
  // No account chosen: the default one (the server applies it, the list shows it).
  const [form, setForm] = useState<Form>(() => emptyAssetForm());
  const [error, setError] = useState<string | null>(null);
  const set: SetField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };
  const filled = form.name.trim() !== '' && form.value.trim() !== '';

  const submit = async () => {
    const result = assetFormResult(form);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    if (await onAdd(result.input)) setForm(emptyAssetForm());
  };

  return (
    <form
      className="asset-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <GroupStep form={form} set={set} />
      <DataStep form={form} set={set} />
      {form.group === 'debt' && <PaymentStep form={form} set={set} accounts={accounts} />}
      {error && (
        <p className="form-error" role="alert">
          {t(error)}
        </p>
      )}
      <div className="button-row">
        <button type="submit" className="btn-secondary" disabled={!filled || pending}>
          {t('app.assets.add')}
        </button>
      </div>
    </form>
  );
}
