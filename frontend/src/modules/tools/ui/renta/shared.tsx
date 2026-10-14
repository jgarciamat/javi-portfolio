import { useI18n } from '@core/i18n/I18nContext';
import type { Disability } from '../../domain/rentaCalc';
import type { RentaForm } from '../../domain/rentaForm';

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
        <span className="renta-number">{n}</span> {t(titleKey)}
      </h2>
      {children}
    </section>
  );
}
