import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { useAction } from '@shared/hooks/useAction';
import { useResource } from '@shared/hooks/useResource';
import { parseDecimal } from '@shared/utils/numbers';
import type { Asset, AssetKind } from '@modules/finances/domain/types';
import '../css/Sections.css';

const KINDS: AssetKind[] = ['investment', 'property', 'vehicle', 'other', 'debt'];

function AssetRow({
  asset,
  onSetValue,
  onRemove,
}: {
  asset: Asset;
  onSetValue: (id: string, value: number) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useI18n();
  const { money, percent } = useFormat();
  const [value, setValue] = useState('');
  const change =
    asset.previousValue && asset.previousValue > 0
      ? ((asset.value - asset.previousValue) / asset.previousValue) * 100
      : null;
  const parsed = parseDecimal(value);

  return (
    <li className="asset-row">
      <div className="asset-main">
        <strong>{asset.name}</strong>
        <small>{t(`app.assets.kind.${asset.kind}`)}</small>
      </div>
      <div className="asset-value">
        <strong>{money(asset.value)}</strong>
        {change !== null && (
          <small className={change >= 0 === (asset.kind !== 'debt') ? 'amount-pos' : 'amount-neg'}>
            {change >= 0 ? '▲' : '▼'} {percent(Math.abs(change), 1)}
          </small>
        )}
      </div>
      <div className="asset-update">
        <input
          className="tx-input"
          inputMode="decimal"
          placeholder={t('app.assets.newValue')}
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
          onClick={() => onRemove(asset.id)}
        >
          🗑️
        </button>
      </div>
    </li>
  );
}

/** Investments, property and debts valued by hand: they are part of the net worth. */
export function AssetsCard({ onChange }: { onChange: () => void }) {
  const { assetApi } = useApi();
  const { t } = useI18n();
  const { money } = useFormat();
  const action = useAction();
  const { data: assets, reload } = useResource(() => assetApi.getAll(), [assetApi], {
    initial: [],
  });
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AssetKind>('investment');
  const [value, setValue] = useState('');
  const amount = parseDecimal(value);
  const valid = name.trim() !== '' && Number.isFinite(amount) && amount >= 0 && value.trim() !== '';
  const total = assets.reduce((sum, a) => sum + (a.kind === 'debt' ? -a.value : a.value), 0);

  const run = (job: () => Promise<unknown>) =>
    action.run(async () => {
      await job();
      await reload();
      onChange();
    });

  return (
    <div className="card">
      <h2 className="section-title">🏦 {t('app.assets.title')}</h2>
      <p className="section-hint">{t('app.assets.hint')}</p>
      {action.error && <p className="form-error">{action.error}</p>}
      {assets.length > 0 && (
        <>
          <ul className="asset-list">
            {assets.map((a) => (
              <AssetRow
                key={a.id}
                asset={a}
                onSetValue={(id, v) => void run(() => assetApi.setValue(id, v))}
                onRemove={(id) => void run(() => assetApi.remove(id))}
              />
            ))}
          </ul>
          <p className="section-total-line">
            {t('app.assets.total')}: <strong>{money(total)}</strong>
          </p>
        </>
      )}
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t('app.assets.name')}</span>
          <input
            className="tx-input"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('app.assets.kind')}</span>
          <select
            className="tx-input"
            value={kind}
            onChange={(e) => setKind(e.target.value as AssetKind)}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`app.assets.kind.${k}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t('app.assets.value')}</span>
          <input
            className="tx-input"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
      </div>
      <div className="button-row">
        <button
          className="btn-secondary"
          disabled={!valid || action.pending}
          onClick={() =>
            void run(async () => {
              await assetApi.create({ name: name.trim(), kind, value: amount });
              setName('');
              setValue('');
            })
          }
        >
          {t('app.assets.add')}
        </button>
      </div>
    </div>
  );
}
