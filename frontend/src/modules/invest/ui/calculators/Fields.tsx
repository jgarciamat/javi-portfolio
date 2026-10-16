import type { ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { intlLocale } from '@shared/utils/format';
import { parseDecimal } from '@shared/utils/numbers';

/** A number typed by the user; anything that is not a number counts as 0 so nothing shows NaN. */
export const num = (text: string): number => {
  const parsed = parseDecimal(text);
  return Number.isFinite(parsed) ? parsed : 0;
};

// es-ES skips the thousands dot under 10.000; the amounts here read better with it.
const GROUP = { useGrouping: 'always' as unknown as boolean };

/** Number and money formatters bound to the UI language. */
export function useNumbers() {
  const { locale } = useI18n();
  const tag = intlLocale(locale);
  return {
    n: (value: number, digits: number) =>
      new Intl.NumberFormat(tag, {
        ...GROUP,
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
      }).format(value),
    eur: (value: number, digits = 0) =>
      new Intl.NumberFormat(tag, {
        ...GROUP,
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value),
    pct: (value: number, digits: number) =>
      `${new Intl.NumberFormat(tag, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value)} %`,
  };
}

export function Field({
  id,
  label,
  value,
  onChange,
  suffix,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="inv-field">
      <label htmlFor={id}>{label}</label>
      <span className="inv-input">
        <input
          id={id}
          className="tx-input"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <small>{suffix}</small>}
      </span>
      {hint && (
        <small id={`${id}-hint`} className="inv-hint">
          {hint}
        </small>
      )}
    </div>
  );
}

/** A result tile: a small label above a big figure. */
export function Stat({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: ReactNode;
  tone?: 'good' | 'bad' | 'warn' | 'accent';
  note?: string;
}) {
  return (
    <div className={`inv-stat${tone ? ` inv-stat--${tone}` : ''}`}>
      <span className="inv-stat-label">{label}</span>
      <strong className="inv-stat-value">{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

export function CalcShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section className="inv-calc" aria-label={title}>
      <h3>{title}</h3>
      <p className="inv-calc-intro">{intro}</p>
      {children}
    </section>
  );
}
