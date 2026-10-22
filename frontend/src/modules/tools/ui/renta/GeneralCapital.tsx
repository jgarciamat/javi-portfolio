import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { parseDecimal } from '@shared/utils/numbers';
import {
  generalCapitalOf,
  type GeneralCapitalBox,
  type GeneralCapitalItem,
  type RelatedLoan,
} from '../../domain/rentaCapitalGeneral';
import { useMoney, type StepProps } from './shared';

const BOXES: GeneralCapitalBox[] = ['0046', '0047', '0048', '0050', '0051'];
const k = (key: string) => `tools.renta.generalCapital.${key}`;

/** An amount typed as text (decimal comma), kept as a number: the text stays while it is typed. */
function Amount({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [text, setText] = useState(value ? String(value).replace('.', ',') : '');
  return (
    <div className="tools-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="tx-input"
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = parseDecimal(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
    </div>
  );
}

/** The loan to a related company of an item of box 0051 (LIRPF art. 46.a). */
function RelatedFields({
  n,
  loan,
  onChange,
}: {
  n: number;
  loan: RelatedLoan;
  onChange: (l: RelatedLoan) => void;
}) {
  const { t } = useI18n();
  const fields: (keyof RelatedLoan)[] = ['interest', 'loan', 'ownFunds', 'share'];
  return (
    <div className="tools-form">
      {fields.map((f) => (
        <Amount
          key={f}
          id={`renta-capital-${n}-${f}`}
          label={t(k(`related.${f}`))}
          value={loan[f] ?? 0}
          onChange={(v) => onChange({ ...loan, [f]: v })}
        />
      ))}
    </div>
  );
}

/** One item of the general base: its box, name, income and expenses. */
function ItemEditor({
  item,
  n,
  onChange,
  onRemove,
}: {
  item: GeneralCapitalItem;
  n: number;
  onChange: (i: GeneralCapitalItem) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const id = (f: string) => `renta-capital-${n}-${f}`;
  return (
    <fieldset className="renta-block">
      <legend>{t(k('item'), { n })}</legend>
      <div className="tools-form">
        <div className="tools-field">
          <label htmlFor={id('box')}>{t(k('box'))}</label>
          <select
            id={id('box')}
            className="tx-input"
            value={item.box}
            onChange={(e) => onChange({ ...item, box: e.target.value as GeneralCapitalBox })}
          >
            {BOXES.map((b) => (
              <option key={b} value={b}>
                {t(k(`boxOpt.${b}`))}
              </option>
            ))}
          </select>
        </div>
        <div className="tools-field">
          <label htmlFor={id('label')}>{t(k('label'))}</label>
          <input
            id={id('label')}
            className="tx-input"
            value={item.label}
            onChange={(e) => onChange({ ...item, label: e.target.value })}
          />
        </div>
      </div>
      {item.box === '0051' && (
        <label className="renta-check">
          <input
            type="checkbox"
            checked={item.related !== undefined}
            onChange={(e) => {
              const { related: _, ...rest } = item;
              onChange(
                e.target.checked
                  ? { ...rest, related: { interest: 0, loan: 0, ownFunds: 0 } }
                  : rest
              );
            }}
          />
          <span>{t(k('related'))}</span>
        </label>
      )}
      {item.box === '0051' && item.related ? (
        <RelatedFields
          n={n}
          loan={item.related}
          onChange={(related) => onChange({ ...item, related })}
        />
      ) : (
        <div className="tools-form">
          <Amount
            id={id('income')}
            label={t(k('income'))}
            value={item.income}
            onChange={(income) => onChange({ ...item, income })}
          />
          <Amount
            id={id('expenses')}
            label={t(k('expenses'))}
            value={item.expenses}
            onChange={(expenses) => onChange({ ...item, expenses })}
          />
        </div>
      )}
      <label className="renta-check">
        <input
          type="checkbox"
          checked={item.irregular === true}
          onChange={(e) => onChange({ ...item, irregular: e.target.checked })}
        />
        <span>{t(k('irregular'))}</span>
      </label>
      <button type="button" className="btn-secondary" onClick={onRemove}>
        {t(k('remove'), { n })}
      </button>
    </fieldset>
  );
}

/**
 * Capital mobiliario of the general base (modelo 100, boxes 0046-0060): a business let with its
 * premises and fittings, technical assistance, rights of others, and the interest of a loan to a
 * related company over three times its own funds.
 */
export function GeneralCapitalSection({ form, set }: StepProps) {
  const { t } = useI18n();
  const money = useMoney();
  const list = form.generalCapital ?? [];
  const update = (next: GeneralCapitalItem[]) => set({ generalCapital: next });
  const r = generalCapitalOf(list);
  return (
    <details className="renta-group" open={list.length > 0}>
      <summary>{t(k('title'))}</summary>
      <p className="section-hint">{t(k('hint'))}</p>
      {list.map((item, i) => (
        <ItemEditor
          key={i}
          item={item}
          n={i + 1}
          onChange={(next) => update(list.map((x, j) => (j === i ? next : x)))}
          onRemove={() => update(list.filter((_, j) => j !== i))}
        />
      ))}
      <button
        type="button"
        className="btn-secondary"
        onClick={() => update([...list, { box: '0046', label: '', income: 0, expenses: 0 }])}
      >
        + {t(k('add'))}
      </button>
      {list.length > 0 && (
        <ul className="renta-minimum" role="status">
          {r.items.map((item, i) => (
            <li key={i}>
              <span>
                {t(k('line'), { n: i + 1, box: item.box })}
                {item.savings > 0 && ` ${t(k('savingsPart'), { amount: money(item.savings) })}`}
              </span>
              <strong>{money(item.reduced)}</strong>
            </li>
          ))}
          <li>
            <span>{t(k('total'))}</span>
            <strong>{money(r.total)}</strong>
          </li>
        </ul>
      )}
    </details>
  );
}
