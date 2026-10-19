import { useI18n } from '@core/i18n/I18nContext';
import type { Disability } from '../../domain/rentaCalc';
import type { RentaForm } from '../../domain/rentaForm';
import { scrollBehavior } from '@shared/utils/motion';

export const DISABILITIES: Disability[] = [0, 33, 65];

/** What every step receives: the form and a way to change a part of it. */
export interface StepProps {
  form: RentaForm;
  set: (patch: Partial<RentaForm>) => void;
}

export function useMoney() {
  const { locale } = useI18n();
  const formatter = new Intl.NumberFormat(locale === 'en' ? 'en-IE' : 'es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  });
  return (n: number) => formatter.format(n);
}

/** The result of a return: to pay above zero, to be refunded below, nothing either way at zero. */
export type ResultTone = 'pay' | 'refund' | 'zero';

export const resultTone = (result: number): ResultTone =>
  Math.round(result * 100) === 0 ? 'zero' : result > 0 ? 'pay' : 'refund';

/** «Te saldría a pagar / a devolver» as the label of a result (the words never depend on colour). */
export const resultLabel = (result: number) =>
  ({
    pay: 'tools.renta.toPay',
    refund: 'tools.renta.refund',
    zero: 'tools.renta.zeroResult',
  }[resultTone(result)]);

/** The amount of a result: red to pay, green to be refunded, neutral at zero (Renta.css). */
export function ResultAmount({ result, money }: { result: number; money: (n: number) => string }) {
  return (
    <strong className={`renta-amount renta-amount--${resultTone(result)}`}>
      {money(Math.abs(result))}
    </strong>
  );
}

/** A long date in the language of the app. */
export function useDate() {
  const { locale } = useI18n();
  return (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'en' ? 'en-IE' : 'es-ES', { dateStyle: 'long' });
}

export function DisabilitySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: Disability;
  onChange: (value: Disability) => void;
}) {
  const { t } = useI18n();
  return (
    <select
      id={id}
      className="tx-input"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) as Disability)}
    >
      {DISABILITIES.map((d) => (
        <option key={d} value={d}>
          {t(`tools.renta.disability.${d}`)}
        </option>
      ))}
    </select>
  );
}

/** Options of one tap: native radios with their label, inside the fieldset of the question. */
export function RadioOptions({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="renta-options">
      {options.map((o) => (
        <label key={o.value} className="renta-option">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

/** A labelled text field of the planner. */
export function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="tools-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="tx-input"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <small className="renta-field-hint">{hint}</small>}
    </div>
  );
}

/** A numbered section of the planner. */
export function Step({
  n,
  titleKey,
  children,
  className = '',
}: {
  n: number;
  titleKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <section className={`renta-step ${className}`.trim()}>
      <h2>
        <span className="renta-number">{n === 0 ? '★' : n}</span> {t(titleKey)}
      </h2>
      {children}
    </section>
  );
}

/** The id of the row of a deduction, to take the person to it. */
export const rowId = (deductionId: string) => `renta-ded-${deductionId}`;

/** Deductions marked as "applies to me", in the order they appear on the page. */
const markedRows = () => [...document.querySelectorAll<HTMLElement>('.renta-deduction--on')];

/** The marked deduction that follows `id` (the first one when `id` is null). */
export function markedAfter(id: string | null): HTMLElement | undefined {
  const rows = markedRows();
  return rows[id === null ? 0 : rows.findIndex((row) => row.id === rowId(id)) + 1];
}

/** Scrolls to a deduction (opening its group) and puts the focus on the amount to fill in. */
export function reveal(row: HTMLElement | null | undefined): void {
  // Without a row, the end of the list: the result.
  const target = row ?? document.querySelector<HTMLElement>('.renta-result');
  // The assistant shows one step at a time: the result may not be on the page.
  if (!target) return;
  const group = target.closest('details');
  if (group) group.open = true;
  // A deduction is centred; the result is shown from its heading.
  target.scrollIntoView({ behavior: scrollBehavior(), block: row ? 'center' : 'start' });
  const field = target.querySelector<HTMLElement>('.renta-deduction-fields input');
  target.tabIndex = -1;
  (field ?? target).focus({ preventScroll: true });
}
