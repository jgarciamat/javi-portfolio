import { useI18n } from '@core/i18n/I18nContext';
import { vatExtrasOf, type InvestmentRow, type VatExtras } from './vatForm';

const REGIMES: VatExtras['regime'][] = ['general', 'simplified', 'reagp'];

/** An investment good of an earlier year: year, VAT borne, percentage deducted, building or not. */
function InvestmentFields({
  row,
  id,
  onChange,
  onRemove,
}: {
  row: InvestmentRow;
  id: number;
  onChange: (patch: Partial<InvestmentRow>) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const k = (key: string) => t(`app.autonomo.vaty.investment.${key}`);
  const field = (name: 'year' | 'vat' | 'pct') => (
    <label className="field">
      <span className="field-label">{k(name)}</span>
      <input
        className="tx-input"
        inputMode="decimal"
        aria-label={`${k(name)} ${id}`}
        value={row[name]}
        onChange={(e) => onChange({ [name]: e.target.value })}
      />
    </label>
  );
  return (
    <li>
      <div className="autonomo-expense-fields">
        {field('year')}
        {field('vat')}
        {field('pct')}
        <button
          type="button"
          className="btn-secondary autonomo-remove"
          aria-label={`${t('app.common.delete')} ${id}`}
          onClick={onRemove}
        >
          ✕
        </button>
      </div>
      <label className="renta-check">
        <input
          type="checkbox"
          aria-label={`${k('realEstate')} ${id}`}
          checked={row.realEstate}
          onChange={(e) => onChange({ realEstate: e.target.checked })}
        />
        <span>{k('realEstate')}</span>
      </label>
    </li>
  );
}

/**
 * The VAT of the year: the prorrata when some sales are exempt, the regime, cash accounting, the
 * investment goods of earlier years, the refund in the fourth quarter and whether the VAT to offset
 * is applied in the quarter of the draft. Each one with a short help: most people need none of it.
 */
export function VatYearPanel({
  value,
  quarter,
  onChange,
}: {
  value: VatExtras | undefined;
  /** The quarter of the draft (1-4). */
  quarter: number;
  onChange: (vat: VatExtras) => void;
}) {
  const { t } = useI18n();
  const v = vatExtrasOf(value);
  const k = (key: string, values?: Record<string, string | number>) =>
    t(`app.autonomo.vaty.${key}`, values);
  const set = (patch: Partial<VatExtras>) => onChange({ ...v, ...patch });
  const skipped = v.skip.includes(quarter);
  const setInvestment = (i: number, patch: Partial<InvestmentRow>) =>
    set({ investments: v.investments.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  return (
    <details
      className="autonomo-vaty"
      open={JSON.stringify(v) !== JSON.stringify(vatExtrasOf(null)) || undefined}
    >
      <summary>{k('title')}</summary>
      <div className="autonomo-grid autonomo-grid--top">
        <label className="field">
          <span className="field-label">{k('regime')}</span>
          <select
            className="tx-input"
            aria-label={k('regime')}
            value={v.regime}
            onChange={(e) => set({ regime: e.target.value as VatExtras['regime'] })}
          >
            {REGIMES.map((r) => (
              <option key={r} value={r}>
                {k(`regimes.${r}`)}
              </option>
            ))}
          </select>
          {v.regime !== 'general' && (
            <small className="autonomo-hint autonomo-warn">{k(`regimeHint.${v.regime}`)}</small>
          )}
        </label>
        <label className="field">
          <span className="field-label">{k('provisional')}</span>
          <input
            className="tx-input"
            inputMode="decimal"
            aria-label={k('provisional')}
            value={v.provisional}
            onChange={(e) => set({ provisional: e.target.value })}
          />
          <small className="autonomo-hint">{k('provisionalHint')}</small>
        </label>
        {v.regime === 'reagp' && (
          <label className="field">
            <span className="field-label">{k('reagpVolume')}</span>
            <input
              className="tx-input"
              inputMode="decimal"
              aria-label={k('reagpVolume')}
              value={v.reagpVolume}
              onChange={(e) => set({ reagpVolume: e.target.value })}
            />
            <small className="autonomo-hint">{k('reagpVolumeHint')}</small>
          </label>
        )}
      </div>
      <div className="autonomo-options">
        <label className="autonomo-option">
          <input
            type="checkbox"
            checked={v.special}
            onChange={(e) => set({ special: e.target.checked })}
          />
          <span>{k('special')}</span>
        </label>
        <label className="autonomo-option">
          <input
            type="checkbox"
            checked={v.cashBasis}
            onChange={(e) => set({ cashBasis: e.target.checked })}
          />
          <span>{k('cashBasis')}</span>
        </label>
        <label className="autonomo-option">
          <input
            type="checkbox"
            checked={skipped}
            onChange={(e) =>
              set({
                skip: e.target.checked
                  ? [...v.skip, quarter].sort()
                  : v.skip.filter((q) => q !== quarter),
              })
            }
          />
          <span>{k('skip', { n: quarter })}</span>
        </label>
        {quarter === 4 && (
          <label className="autonomo-option">
            <input
              type="checkbox"
              checked={v.refund}
              onChange={(e) => set({ refund: e.target.checked })}
            />
            <span>{k('refund')}</span>
          </label>
        )}
      </div>
      <h5>{k('investmentsTitle')}</h5>
      <p className="section-hint">{k('investmentsHint')}</p>
      <ul className="autonomo-expenses">
        {v.investments.map((row, i) => (
          <InvestmentFields
            key={i}
            row={row}
            id={i + 1}
            onChange={(patch) => setInvestment(i, patch)}
            onRemove={() => set({ investments: v.investments.filter((_, j) => j !== i) })}
          />
        ))}
      </ul>
      <button
        type="button"
        className="autonomo-add"
        onClick={() =>
          set({
            investments: [...v.investments, { year: '', vat: '', pct: '', realEstate: false }],
          })
        }
      >
        + {k('investmentsAdd')}
      </button>
    </details>
  );
}
