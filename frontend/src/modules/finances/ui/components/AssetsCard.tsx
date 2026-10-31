import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { useAction } from '@shared/hooks/useAction';
import { useResource } from '@shared/hooks/useResource';
import { parseDecimal } from '@shared/utils/numbers';
import type { Account, Asset, DebtPaymentInput } from '@modules/finances/domain/types';
import type { CsvTable } from '../../application/hooks/useExportCSV';
import { useFinances } from '../../application/FinancesContext';
import '../css/Sections.css';
import { Icon } from '@shared/components/Icon';
import { ExportButtons } from './ExportButtons';
import { DebtPlanCard } from './DebtPlanCard';
import { AssetForm } from './AssetForm';
import { ConfirmModal, DebtDetails } from './DebtDetails';
import { PremiumGate } from '@modules/billing/ui/PremiumGate';

/** «Hipoteca» for a debt with its type, otherwise the kind («Vehículo», «Deuda»…). */
const kindLabel = (asset: Asset, t: (key: string) => string): string =>
  asset.debtType ? t(`app.assets.debtType.${asset.debtType}`) : t(`app.assets.kind.${asset.kind}`);

/** Its value (a debt in negative: it subtracts) and the change since the previous one. */
function AssetAmount({ asset }: { asset: Asset }) {
  const { money, percent } = useFormat();
  const isDebt = asset.kind === 'debt';
  const change =
    asset.previousValue && asset.previousValue > 0
      ? ((asset.value - asset.previousValue) / asset.previousValue) * 100
      : null;
  return (
    <div className="asset-value">
      <strong className={isDebt && asset.value > 0 ? 'amount-neg' : undefined}>
        {money(isDebt && asset.value > 0 ? -asset.value : asset.value)}
      </strong>
      {change !== null && (
        <small className={change >= 0 === !isDebt ? 'amount-pos' : 'amount-neg'}>
          {change >= 0 ? '▲' : '▼'} {percent(Math.abs(change), 1)}
        </small>
      )}
    </div>
  );
}

/** «New value» and «Update», and removing it. */
function ValueUpdate({
  asset,
  onSetValue,
  onRemove,
}: {
  asset: Asset;
  onSetValue: (id: string, value: number) => void;
  onRemove: (asset: Asset) => void;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const parsed = parseDecimal(value);
  return (
    <div className="asset-update">
      <input
        className="tx-input"
        inputMode="decimal"
        placeholder={t(asset.kind === 'debt' ? 'app.assets.newOwed' : 'app.assets.newValue')}
        aria-label={t('app.assets.updateValue', { name: asset.name })}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        className="btn-secondary"
        disabled={!Number.isFinite(parsed) || parsed < 0 || value.trim() === ''}
        onClick={() => {
          onSetValue(asset.id, parsed);
          setValue('');
        }}
      >
        {t('app.assets.update')}
      </button>
      <button
        className="btn-secondary"
        aria-label={t('app.assets.remove', { name: asset.name })}
        onClick={() => onRemove(asset)}
      >
        <Icon name="trash" />
      </button>
    </div>
  );
}

function AssetRow({
  asset,
  accounts,
  pending,
  onSetValue,
  onRemove,
  onSavePayment,
}: {
  asset: Asset;
  accounts: Account[];
  pending: boolean;
  onSetValue: (id: string, value: number) => void;
  onRemove: (asset: Asset) => void;
  onSavePayment: (asset: Asset, payment: DebtPaymentInput | null) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const isDebt = asset.kind === 'debt';
  return (
    <li className={`asset-row${isDebt ? ' asset-row--debt' : ''}`}>
      <div className="asset-main">
        <strong>{asset.name}</strong>
        <small>
          {kindLabel(asset, t)}
          {asset.paidOff ? ` · ${t('app.assets.debt.paid')}` : ''}
        </small>
      </div>
      <AssetAmount asset={asset} />
      {isDebt && (
        <DebtDetails
          debt={asset}
          accounts={accounts}
          pending={pending}
          onSave={(payment) => onSavePayment(asset, payment)}
        />
      )}
      <ValueUpdate asset={asset} onSetValue={onSetValue} onRemove={onRemove} />
    </li>
  );
}

/** What a free account sees once it has its elements. */
function LimitGate({ onUpgrade }: { onUpgrade: () => void }) {
  const { t } = useI18n();
  return (
    <PremiumGate>
      <p className="section-hint">{t('app.assets.usedFree')}</p>
      <button className="btn-primary" onClick={onUpgrade}>
        {t('billing.seePlans')}
      </button>
    </PremiumGate>
  );
}

/** The investments, goods and debts as a table, with their latest value. */
function assetsTable(assets: Asset[], t: (key: string) => string, currency: string): CsvTable {
  return {
    head: [
      t('app.assets.name'),
      t('app.assets.kind'),
      `${t('app.assets.value')} (${currency})`,
      t('app.assets.export.valueDate'),
      `${t('app.assets.export.previous')} (${currency})`,
      t('app.assets.export.rate'),
      `${t('app.assets.export.minPayment')} (${currency})`,
    ],
    rows: assets.map((a) => [
      a.name,
      kindLabel(a, t),
      a.value,
      a.valueDate?.slice(0, 10),
      a.previousValue,
      a.interestRate,
      a.payment?.amount ?? a.minPayment,
    ]),
  };
}

/**
 * Investments, property and debts valued by hand: they are part of the net worth. A debt paid
 * every month lowers by itself with the payments of its automatic operation.
 */
export function AssetsCard() {
  const { assetApi } = useApi();
  const { t } = useI18n();
  const { money, currency } = useFormat();
  const plan = useOptionalPlan();
  const finances = useFinances();
  const action = useAction();
  const { data: assets, reload } = useResource(() => assetApi.getAll(), [assetApi], {
    initial: [],
  });
  const [removing, setRemoving] = useState<Asset | null>(null);
  const debts = assets.filter((a) => a.kind === 'debt' && a.value > 0);
  // The free plan keeps a few elements (of any kind); adding more needs Premium.
  const limit = plan?.overview?.limits.resources.assets;
  const locked = limit !== null && limit !== undefined && assets.length >= limit;
  const total = assets.reduce((sum, a) => sum + (a.kind === 'debt' ? -a.value : a.value), 0);

  /** Runs a change and reads everything it may move (the list, the accounts, the months). */
  const run = (job: () => Promise<unknown>) =>
    action.run(async () => {
      await job();
      await Promise.all([reload(), finances.refresh({ invalidate: true })]);
    });

  const remove = (asset: Asset) => {
    setRemoving(null);
    void run(() => assetApi.remove(asset.id));
  };

  return (
    <>
      <div className="card">
        <h2 className="section-title">
          <Icon name="bank" /> {t('app.assets.title')}
        </h2>
        <p className="section-hint">{t('app.assets.hint')}</p>
        <ExportButtons
          name="patrimonio"
          what={t('app.assets.title')}
          count={assets.length}
          table={() => assetsTable(assets, t, currency)}
          pdf
        />
        {action.error && <p className="form-error">{action.error}</p>}
        {assets.length > 0 && (
          <>
            <ul className="asset-list">
              {assets.map((a) => (
                <AssetRow
                  key={a.id}
                  asset={a}
                  accounts={finances.accounts}
                  pending={action.pending}
                  onSetValue={(id, v) => void run(() => assetApi.setValue(id, v))}
                  onRemove={(asset) => (asset.payment ? setRemoving(asset) : remove(asset))}
                  onSavePayment={(asset, payment) =>
                    run(() => assetApi.updateDebt(asset.id, { payment }))
                  }
                />
              ))}
            </ul>
            <p className="section-total-line">
              {t('app.assets.total')}: <strong>{money(total)}</strong>
            </p>
          </>
        )}
        {locked ? (
          <LimitGate
            onUpgrade={() =>
              plan?.openUpgrade({ kind: 'limit', resource: 'assets', limit: limit as number })
            }
          />
        ) : (
          <AssetForm
            accounts={finances.accounts}
            pending={action.pending}
            onAdd={(input) => run(() => assetApi.create(input))}
          />
        )}
      </div>
      {debts.length > 0 && (
        <DebtPlanCard
          debts={debts}
          onChanged={() => void Promise.all([reload(), finances.refresh({ invalidate: true })])}
        />
      )}
      {removing && (
        <ConfirmModal
          title={t('app.assets.removeTitle', { name: removing.name })}
          message={t('app.assets.removeMessage')}
          confirm={t('app.assets.removeConfirm')}
          onConfirm={() => remove(removing)}
          onCancel={() => setRemoving(null)}
        />
      )}
    </>
  );
}
