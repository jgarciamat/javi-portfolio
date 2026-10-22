import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { parseDecimal } from '@shared/utils/numbers';
import { rentaAbatement } from '../../data/renta/abatimiento';
import { useRentaRules } from './RentaRulesContext';
import {
  emptySavingsDetail,
  savingsOf,
  type AssetKind,
  type AssetOps,
  type CapitalIncome,
  type PendingBalance,
  type PropertySale,
  type SavingsDetail,
} from '../../domain/rentaGains';
import { useMoney, type StepProps } from './shared';
import { InvestLink } from './InvestCard';
import { InvestImport } from './invest/InvestImport';

const KINDS: AssetKind[] = ['listed', 'fund', 'crypto', 'unlisted', 'other'];
const EXEMPTIONS: PropertySale['exemption'][] = ['none', 'homeOver65', 'reinvested', 'annuity'];
const CAPITAL: (keyof CapitalIncome)[] = [
  'interest',
  'dividends',
  'bills',
  'assets',
  'insurance',
  'expenses',
];
/** The four years before the return, whose negative balances can still be used. */
/** The four years before the return's. */
const yearsBefore = (year: number) => [4, 3, 2, 1].map((n) => year - n);

/** An amount typed as text (decimal comma), kept as a number: the text stays while it is typed. */
function Amount({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [text, setText] = useState(value ? String(value).replace('.', ',') : '');
  return (
    <label className="tools-field">
      <span>{label}</span>
      <input
        className="tx-input"
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = parseDecimal(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="tools-field">
      <span>{label}</span>
      <input
        className="tx-input"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Bought before 31-12-1994: the abatement coefficients may apply (LIRPF DT 9.ª). */
const pre1995 = (date: string) => date !== '' && date <= rentaAbatement.acquiredUntil;

const replace = <T,>(list: T[], i: number, item: T) => list.map((x, j) => (j === i ? item : x));
const without = <T,>(list: T[], i: number) => list.filter((_, j) => j !== i);

/** One asset: its purchases (also from earlier years) and its sales of the year. */
function AssetEditor({
  asset,
  n,
  onChange,
  onRemove,
}: {
  asset: AssetOps;
  n: number;
  onChange: (a: AssetOps) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const k = 'tools.renta.gains';
  return (
    <fieldset className="renta-block">
      <legend>{t(`${k}.asset`, { n })}</legend>
      <div className="tools-form">
        <label className="tools-field">
          <span>{t(`${k}.name`)}</span>
          <input
            className="tx-input"
            value={asset.name}
            onChange={(e) => onChange({ ...asset, name: e.target.value })}
          />
        </label>
        <label className="tools-field">
          <span>{t(`${k}.kind`)}</span>
          <select
            className="tx-input"
            value={asset.kind}
            onChange={(e) => onChange({ ...asset, kind: e.target.value as AssetKind })}
          >
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`${k}.kind.${kind}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <h4>{t(`${k}.buys`)}</h4>
      {asset.buys.map((b, i) => (
        <div key={i} className="tools-form">
          <DateField
            label={t(`${k}.date`)}
            value={b.date}
            onChange={(date) =>
              onChange({ ...asset, buys: replace(asset.buys, i, { ...b, date }) })
            }
          />
          <Amount
            label={t(`${k}.units`)}
            value={b.units}
            onChange={(units) =>
              onChange({ ...asset, buys: replace(asset.buys, i, { ...b, units }) })
            }
          />
          <Amount
            label={t(`${k}.cost`)}
            value={b.cost}
            onChange={(cost) =>
              onChange({ ...asset, buys: replace(asset.buys, i, { ...b, cost }) })
            }
          />
          {pre1995(b.date) && (asset.kind === 'listed' || asset.kind === 'fund') && (
            <Amount
              label={t(`${k}.ip2005`)}
              value={b.ip2005 ?? 0}
              onChange={(ip2005) =>
                onChange({ ...asset, buys: replace(asset.buys, i, { ...b, ip2005 }) })
              }
            />
          )}
          <button
            className="btn-secondary"
            onClick={() => onChange({ ...asset, buys: without(asset.buys, i) })}
          >
            {t(`${k}.remove`)}
          </button>
        </div>
      ))}
      <button
        className="btn-secondary"
        onClick={() =>
          onChange({ ...asset, buys: [...asset.buys, { date: '', units: 0, cost: 0 }] })
        }
      >
        {t(`${k}.addBuy`)}
      </button>
      <h4>{t(`${k}.sells`)}</h4>
      {asset.sells.map((s, i) => (
        <div key={i} className="tools-form">
          <DateField
            label={t(`${k}.date`)}
            value={s.date}
            onChange={(date) =>
              onChange({ ...asset, sells: replace(asset.sells, i, { ...s, date }) })
            }
          />
          <Amount
            label={t(`${k}.units`)}
            value={s.units}
            onChange={(units) =>
              onChange({ ...asset, sells: replace(asset.sells, i, { ...s, units }) })
            }
          />
          <Amount
            label={t(`${k}.proceeds`)}
            value={s.proceeds}
            onChange={(proceeds) =>
              onChange({ ...asset, sells: replace(asset.sells, i, { ...s, proceeds }) })
            }
          />
          <button
            className="btn-secondary"
            onClick={() => onChange({ ...asset, sells: without(asset.sells, i) })}
          >
            {t(`${k}.remove`)}
          </button>
        </div>
      ))}
      <div className="button-row">
        <button
          className="btn-secondary"
          onClick={() =>
            onChange({ ...asset, sells: [...asset.sells, { date: '', units: 0, proceeds: 0 }] })
          }
        >
          {t(`${k}.addSell`)}
        </button>
        <button className="btn-secondary" onClick={onRemove}>
          {t(`${k}.removeAsset`)}
        </button>
      </div>
    </fieldset>
  );
}

/** One property sold: its values and the exemption of the main home. */
function PropertyEditor({
  sale,
  n,
  onChange,
  onRemove,
}: {
  sale: PropertySale;
  n: number;
  onChange: (p: PropertySale) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const k = 'tools.renta.gains';
  return (
    <fieldset className="renta-block">
      <legend>{t(`${k}.property`, { n })}</legend>
      <div className="tools-form">
        <Amount
          label={t(`${k}.propertyProceeds`)}
          value={sale.proceeds}
          onChange={(proceeds) => onChange({ ...sale, proceeds })}
        />
        <Amount
          label={t(`${k}.propertyCost`)}
          value={sale.cost}
          onChange={(cost) => onChange({ ...sale, cost })}
        />
        <Amount
          label={t(`${k}.amortization`)}
          value={sale.amortization}
          onChange={(amortization) => onChange({ ...sale, amortization })}
        />
        <DateField
          label={t(`${k}.acquired`)}
          value={sale.acquired ?? ''}
          onChange={(acquired) => onChange({ ...sale, acquired })}
        />
        <DateField
          label={t(`${k}.sold`)}
          value={sale.sold ?? ''}
          onChange={(sold) => onChange({ ...sale, sold })}
        />
        <label className="tools-field">
          <span>{t(`${k}.exemption`)}</span>
          <select
            className="tx-input"
            value={sale.exemption}
            onChange={(e) =>
              onChange({ ...sale, exemption: e.target.value as PropertySale['exemption'] })
            }
          >
            {EXEMPTIONS.map((x) => (
              <option key={x} value={x}>
                {t(`${k}.exemption.${x}`)}
              </option>
            ))}
          </select>
        </label>
        {sale.exemption === 'annuity' && (
          <>
            <Amount
              label={t(`${k}.annuityReinvested`)}
              value={sale.reinvested ?? 0}
              onChange={(reinvested) => onChange({ ...sale, reinvested })}
            />
            <Amount
              label={t(`${k}.annuityPrior`)}
              value={sale.annuityPrior ?? 0}
              onChange={(annuityPrior) => onChange({ ...sale, annuityPrior })}
            />
          </>
        )}
        {sale.exemption === 'reinvested' && (
          <>
            <Amount
              label={t(`${k}.reinvested`)}
              value={sale.reinvested ?? 0}
              onChange={(reinvested) => onChange({ ...sale, reinvested })}
            />
            <Amount
              label={t(`${k}.pendingLoan`)}
              value={sale.pendingLoan ?? 0}
              onChange={(pendingLoan) => onChange({ ...sale, pendingLoan })}
            />
          </>
        )}
      </div>
      {sale.exemption === 'annuity' && <p className="section-hint">{t(`${k}.annuityHint`)}</p>}
      {pre1995(sale.acquired ?? '') && <p className="section-hint">{t(`${k}.abatementHint`)}</p>}
      <button className="btn-secondary" onClick={onRemove}>
        {t(`${k}.removeProperty`)}
      </button>
    </fieldset>
  );
}

/** The negative balances of the four years before, one field per year. */
function PendingEditor({
  kind,
  list,
  onChange,
}: {
  kind: keyof SavingsDetail['pending'];
  list: PendingBalance[];
  onChange: (list: PendingBalance[]) => void;
}) {
  const { t } = useI18n();
  const rules = useRentaRules();
  const amountOf = (year: number) => list.find((p) => p.year === year)?.amount ?? 0;
  const set = (year: number, amount: number) =>
    onChange([...list.filter((p) => p.year !== year), { year, amount }]);
  return (
    <div className="tools-form">
      {yearsBefore(rules.year).map((year) => (
        <Amount
          key={year}
          label={t(`tools.renta.gains.pending.${kind}`, { year })}
          value={amountOf(year)}
          onChange={(n) => set(year, n)}
        />
      ))}
    </div>
  );
}

/** What the detail gives: the savings base, what is carried forward and what to check. */
function Summary({ detail }: { detail: SavingsDetail }) {
  const { t } = useI18n();
  const money = useMoney();
  const { year } = useRentaRules();
  const r = savingsOf(detail, year);
  const k = 'tools.renta.gains';
  const carried = [...r.carryForward.gains, ...r.carryForward.capital].reduce(
    (s, p) => s + p.amount,
    0
  );
  const unmatched = r.sales.filter((s) => s.unmatched > 0);
  const deferred = r.sales.filter((s) => s.deferred > 0);
  const check = r.sales.filter((s) => s.checkRepurchase);
  const needsIp = r.sales.filter((s) => s.needsIp2005);
  const reduced = [...r.sales, ...r.properties].reduce((sum, x) => sum + (x.reduction ?? 0), 0);
  return (
    <div className="renta-block" role="status">
      <ul className="renta-minimum">
        {r.sales.map((s, i) => (
          <li key={i}>
            <span>{t(`${k}.saleLine`, { name: s.name, date: s.date })}</span>
            <strong>{money(s.gain)}</strong>
          </li>
        ))}
        {r.properties.map((p, i) => (
          <li key={`p${i}`}>
            <span>{t(`${k}.propertyLine`, { n: i + 1, exempt: money(p.exempt) })}</span>
            <strong>{money(p.taxable)}</strong>
          </li>
        ))}
        {reduced > 0 && (
          <li>
            <span>{t(`${k}.abatement`)}</span>
            <strong>{money(-reduced)}</strong>
          </li>
        )}
        <li>
          <span>{t(`${k}.base`)}</span>
          <strong>{money(r.boxes['0460'])}</strong>
        </li>
        {r.general.positive > 0 && (
          <li>
            <span>{t(`${k}.generalLine`)}</span>
            <strong>{money(r.general.positive)}</strong>
          </li>
        )}
      </ul>
      {carried > 0 && (
        <p className="section-hint">{t(`${k}.carried`, { amount: money(carried) })}</p>
      )}
      {unmatched.length > 0 && (
        <p className="form-error">{t(`${k}.unmatched`, { name: unmatched[0].name })}</p>
      )}
      {deferred.length > 0 && (
        <p className="section-hint">{t(`${k}.deferred`, { name: deferred[0].name })}</p>
      )}
      {needsIp.length > 0 && (
        <p className="form-error">{t(`${k}.needsIp2005`, { name: needsIp[0].name })}</p>
      )}
      {check.length > 0 && (
        <p className="section-hint">{t(`${k}.checkRepurchase`, { name: check[0].name })}</p>
      )}
    </div>
  );
}

/** The savings in detail: interest and dividends, sales lot by lot, properties and earlier losses. */
export function SavingsDetailSection({
  form,
  set,
  importer = true,
  onImport,
}: StepProps & {
  /** The importer here; without it, a way to the card «My investments» of the screen. */
  importer?: boolean;
  /** Goes to that card (the assistant opens its step); else the page scrolls to it. */
  onImport?: () => void;
}) {
  const { t } = useI18n();
  const { year } = useRentaRules();
  const [importing, setImporting] = useState(false);
  const detail = form.savingsDetail;
  const k = 'tools.renta.gains';
  const update = (patch: Partial<SavingsDetail>) =>
    set({ savingsDetail: { ...(detail as SavingsDetail), ...patch } });
  return (
    <>
      <label className="renta-check">
        <input
          type="checkbox"
          checked={detail !== undefined}
          onChange={(e) =>
            set({ savingsDetail: e.target.checked ? emptySavingsDetail() : undefined })
          }
        />
        <span>{t(`${k}.on`)}</span>
      </label>
      {importer ? (
        <button
          className="btn-secondary"
          aria-expanded={importing}
          onClick={() => setImporting(!importing)}
        >
          {t('tools.invest.open')}
        </button>
      ) : (
        <InvestLink form={form} onGo={onImport} />
      )}
      {importing && (
        <InvestImport
          year={year}
          onApply={(imported) =>
            set({
              savingsDetail: {
                ...(detail ?? emptySavingsDetail()),
                imported: imported ?? undefined,
              },
            })
          }
        />
      )}
      {detail && (
        <div className="renta-block">
          <p className="section-hint">{t(`${k}.hint`)}</p>
          {detail.imported && (
            <p className="section-hint" role="status">
              {t('tools.invest.inRenta', {
                files: detail.imported.files.join(', '),
                count: detail.imported.assets.length,
              })}{' '}
              <button className="btn-secondary" onClick={() => update({ imported: undefined })}>
                {t('tools.invest.remove')}
              </button>
            </p>
          )}
          <h4>{t(`${k}.capital`)}</h4>
          <div className="tools-form">
            {CAPITAL.map((key) => (
              <Amount
                key={key}
                label={t(`${k}.capital.${key}`)}
                value={detail.capital[key]}
                onChange={(n) => update({ capital: { ...detail.capital, [key]: n } })}
              />
            ))}
          </div>
          <h4>{t(`${k}.assets`)}</h4>
          {detail.assets.map((a, i) => (
            <AssetEditor
              key={i}
              asset={a}
              n={i + 1}
              onChange={(asset) => update({ assets: replace(detail.assets, i, asset) })}
              onRemove={() => update({ assets: without(detail.assets, i) })}
            />
          ))}
          <button
            className="btn-secondary"
            onClick={() =>
              update({
                assets: [...detail.assets, { name: '', kind: 'listed', buys: [], sells: [] }],
              })
            }
          >
            {t(`${k}.addAsset`)}
          </button>
          <h4>{t(`${k}.properties`)}</h4>
          {detail.properties.map((p, i) => (
            <PropertyEditor
              key={i}
              sale={p}
              n={i + 1}
              onChange={(sale) => update({ properties: replace(detail.properties, i, sale) })}
              onRemove={() => update({ properties: without(detail.properties, i) })}
            />
          ))}
          <button
            className="btn-secondary"
            onClick={() =>
              update({
                properties: [
                  ...detail.properties,
                  { name: '', proceeds: 0, cost: 0, amortization: 0, exemption: 'none' },
                ],
              })
            }
          >
            {t(`${k}.addProperty`)}
          </button>
          <div className="tools-form">
            <Amount
              label={t(`${k}.abatementPrior`, { last: year - 1 })}
              value={detail.abatementPrior ?? 0}
              onChange={(n) => update({ abatementPrior: n })}
            />
            <Amount
              label={t(`${k}.other`)}
              value={detail.otherGains[0] ?? 0}
              onChange={(n) => update({ otherGains: [n] })}
            />
            <Amount
              label={t(`${k}.general`)}
              value={detail.generalGains[0] ?? 0}
              onChange={(n) => update({ generalGains: [n] })}
            />
          </div>
          <details className="renta-group">
            <summary>{t(`${k}.pending`)}</summary>
            {(['gains', 'capital', 'general'] as const).map((kind) => (
              <PendingEditor
                key={kind}
                kind={kind}
                list={detail.pending[kind]}
                onChange={(list) => update({ pending: { ...detail.pending, [kind]: list } })}
              />
            ))}
          </details>
          <Summary detail={detail} />
        </div>
      )}
    </>
  );
}
