import { useI18n } from '@core/i18n/I18nContext';
import { KEYS_349, type Key349 } from '@modules/finances/domain/types';
import {
  CASH_FIELDS,
  CASH_RATES,
  ONE_OFF_FIELDS,
  RE_FIELDS,
  SALES_FIELDS,
  emptyIntra,
  isEmptyVat,
  type IntraRow,
  type SalesField,
  type VatForm,
} from './vatForm';

/** Operations that few sole traders have: they carry a «not usual» note. */
const RARE: SalesField[] = ['oss', 'ossSubject', 'reverse', 'exemptOccasional', 'nonVat'];
/** The box of the 303 each field goes to, shown next to its name. */
const SALES_BOX: Record<SalesField, string> = {
  intraEU: '59',
  exports: '60',
  notSubject: '120',
  oss: '123',
  ossSubject: '124',
  reverse: '122',
  exempt: '—',
  exemptOccasional: '—',
  nonVat: '—',
};
const ONE_OFF_BOX = { reagp: '42', investmentAdjust: '43', art80: '76', importDeferred: '77' };
const FIX_GROUPS = [
  ['salesFix', ['base', 'vat', 'priorYear'], '14-15'],
  ['reFix', ['base', 'fee'], '25-26'],
  ['deductionFix', ['base', 'vat'], '40-41'],
  ['intraFix', ['base', 'vat'], '40-41'],
] as const;

/** A labelled amount with a short help. */
function Amount({
  label,
  hint,
  value,
  onChange,
  quarter,
  rare = false,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  /** The quarter (from 1), to tell the fields of each quarter apart. */
  quarter: number;
  rare?: boolean;
}) {
  const { t } = useI18n();
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {rare && <small className="autonomo-rare"> · {t('app.autonomo.vatq.rare')}</small>}
      </span>
      <input
        className="tx-input"
        inputMode="decimal"
        aria-label={`${label} ${quarter}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <small className="autonomo-hint">{hint}</small>
    </label>
  );
}

/** One operation of the 349: key, VAT number, name, base and, for a correction, its period. */
function IntraRowFields({
  row,
  id,
  year,
  onChange,
  onRemove,
}: {
  row: IntraRow;
  id: string;
  year: number;
  onChange: (patch: Partial<IntraRow>) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const k = (key: string) => t(`app.autonomo.vatq.intra.${key}`);
  const text = (field: 'vatId' | 'name' | 'base' | 'rectYear' | 'previous', mode?: 'decimal') => (
    <label className="field">
      <span className="field-label">{k(field)}</span>
      <input
        className="tx-input"
        inputMode={mode}
        aria-label={`${k(field)} ${id}`}
        value={row[field]}
        onChange={(e) => onChange({ [field]: e.target.value })}
      />
    </label>
  );
  return (
    <li className="autonomo-intra-row">
      <div className="autonomo-expense-top">
        <label className="field">
          <span className="field-label">{k('key')}</span>
          <select
            className="tx-input"
            aria-label={`${k('key')} ${id}`}
            value={row.key}
            onChange={(e) => onChange({ key: e.target.value as Key349 })}
          >
            {KEYS_349.map((key) => (
              <option key={key} value={key}>
                {key} · {t(`app.autonomo.vatq.intra.keys.${key}`)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn-secondary autonomo-remove"
          aria-label={`${t('app.common.delete')} ${id}`}
          onClick={onRemove}
        >
          ✕
        </button>
      </div>
      <div className="autonomo-expense-fields">
        {text('vatId')}
        {text('name')}
        {text('base', 'decimal')}
      </div>
      <label className="renta-check">
        <input
          type="checkbox"
          aria-label={`${k('rect')} ${id}`}
          checked={row.rect}
          onChange={(e) =>
            onChange({ rect: e.target.checked, rectYear: row.rectYear || String(year) })
          }
        />
        <span>{k('rect')}</span>
      </label>
      {row.rect && (
        <div className="autonomo-expense-fields">
          {text('rectYear', 'decimal')}
          <label className="field">
            <span className="field-label">{k('rectQuarter')}</span>
            <select
              className="tx-input"
              aria-label={`${k('rectQuarter')} ${id}`}
              value={row.rectQuarter}
              onChange={(e) => onChange({ rectQuarter: e.target.value })}
            >
              <option value="">—</option>
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={String(q)}>
                  {q}T
                </option>
              ))}
            </select>
          </label>
          {text('previous', 'decimal')}
        </div>
      )}
    </li>
  );
}

/**
 * The VAT of a quarter that the invoices with VAT do not say: sales without Spanish VAT, sales to
 * retailers in the surcharge, the intra-EU operations of the 349, corrections and the rare boxes.
 * Folded unless something is typed in it.
 */
export function QuarterVatPanel({
  q,
  year,
  vat,
  cashBasis,
  onChange,
}: {
  /** The quarter, from 0. */
  q: number;
  year: number;
  vat: VatForm;
  /** Cash accounting: the collections and payments of the quarter are asked for. */
  cashBasis: boolean;
  onChange: (vat: VatForm) => void;
}) {
  const { t } = useI18n();
  const k = (key: string, values?: Record<string, string | number>) =>
    t(`app.autonomo.vatq.${key}`, values);
  const n = q + 1;
  const setIntra = (i: number, patch: Partial<IntraRow>) =>
    onChange({ ...vat, intra: vat.intra.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  return (
    <details className="autonomo-vatq" open={!isEmptyVat(vat) || undefined}>
      <summary>{k('title')}</summary>
      <p className="section-hint">{k('hint')}</p>

      <h5>{k('salesTitle')}</h5>
      <div className="autonomo-grid">
        {SALES_FIELDS.map((f) => (
          <Amount
            key={f}
            label={`${k(`sales.${f}`)} (${SALES_BOX[f]})`}
            quarter={n}
            hint={k(`salesHint.${f}`)}
            value={vat.sales[f]}
            rare={RARE.includes(f)}
            onChange={(value) => onChange({ ...vat, sales: { ...vat.sales, [f]: value } })}
          />
        ))}
      </div>

      <h5>{k('reTitle')}</h5>
      <p className="section-hint">{k('reHint')}</p>
      <div className="autonomo-grid">
        {RE_FIELDS.map((f) => (
          <Amount
            key={f}
            label={k(`re.${f}`)}
            quarter={n}
            hint={k(`reBox.${f}`)}
            value={vat.re[f]}
            rare={f === 'tobacco'}
            onChange={(value) => onChange({ ...vat, re: { ...vat.re, [f]: value } })}
          />
        ))}
      </div>

      <h5>{k('intra.title')}</h5>
      <p className="section-hint">{k('intra.hint')}</p>
      <ul className="autonomo-expenses">
        {vat.intra.map((row, i) => (
          <IntraRowFields
            key={i}
            row={row}
            id={`${n}.${i + 1}`}
            year={year}
            onChange={(patch) => setIntra(i, patch)}
            onRemove={() => onChange({ ...vat, intra: vat.intra.filter((_, j) => j !== i) })}
          />
        ))}
      </ul>
      <button
        type="button"
        className="autonomo-add"
        onClick={() => onChange({ ...vat, intra: [...vat.intra, emptyIntra()] })}
      >
        + {k('intra.add')}
      </button>

      <h5>{k('fixTitle')}</h5>
      <p className="section-hint">{k('fixHint')}</p>
      <div className="autonomo-grid">
        {FIX_GROUPS.flatMap(([group, fields, boxes]) =>
          fields.map((f) => (
            <Amount
              key={`${group}.${f}`}
              label={k(`fix.${group}.${f}`)}
              quarter={n}
              hint={k(`fix.${group}.hint`, { boxes })}
              value={(vat[group] as Record<string, string>)[f]}
              rare={group !== 'salesFix'}
              onChange={(value) => onChange({ ...vat, [group]: { ...vat[group], [f]: value } })}
            />
          ))
        )}
      </div>

      <h5>{k('oneOffTitle')}</h5>
      <div className="autonomo-grid">
        {ONE_OFF_FIELDS.map((f) => (
          <Amount
            key={f}
            label={`${k(`oneOff.${f}`)} (${ONE_OFF_BOX[f]})`}
            quarter={n}
            hint={k(`oneOffHint.${f}`)}
            value={vat.oneOff[f]}
            rare
            onChange={(value) => onChange({ ...vat, oneOff: { ...vat.oneOff, [f]: value } })}
          />
        ))}
      </div>

      {cashBasis && (
        <>
          <h5>{k('cashTitle')}</h5>
          <p className="section-hint">{k('cashHint')}</p>
          <div className="autonomo-grid">
            {CASH_FIELDS.flatMap((group) =>
              CASH_RATES.map((r) => (
                <Amount
                  key={`${group}.${r}`}
                  label={k(`cash.${group}`, { rate: r.slice(1) })}
                  quarter={n}
                  hint={k(`cashBox.${group}`)}
                  value={vat.cash[group][r]}
                  onChange={(value) =>
                    onChange({
                      ...vat,
                      cash: { ...vat.cash, [group]: { ...vat.cash[group], [r]: value } },
                    })
                  }
                />
              ))
            )}
          </div>
        </>
      )}
    </details>
  );
}
