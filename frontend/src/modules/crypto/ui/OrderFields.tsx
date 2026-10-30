import { useId, type ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import type { Direction } from '../domain/types';
import { useMoney } from './money';

/**
 * The fields shared by the order box and «Register a trade I already opened»: a choice of a few
 * options, a number with its unit and the take profit and stop loss.
 */
export function Segmented<T extends string>({
  name,
  legend,
  options,
  value,
  label,
  title,
  onChange,
}: {
  name: string;
  legend: string;
  options: T[];
  value: T;
  label: (option: T) => ReactNode;
  title?: (option: T) => string;
  onChange: (option: T) => void;
}) {
  return (
    <fieldset className={`cc-segmented cc-segmented--wide cc-${name}`}>
      <legend className="cc-label">{legend}</legend>
      {options.map((option) => (
        <label
          key={option}
          className={option === value ? `is-on cc-${option}` : `cc-${option}`}
          title={title?.(option)}
        >
          <input
            type="radio"
            name={`cc-${name}`}
            value={option}
            checked={option === value}
            onChange={() => onChange(option)}
          />
          {label(option)}
        </label>
      ))}
    </fieldset>
  );
}

/** A number field with its unit (€ or $) shown inside. */
export function UnitField({
  label,
  unit,
  value,
  onChange,
  hint,
  children,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="cc-field">
      <label className="cc-label" htmlFor={id}>
        {label}
      </label>
      <div className="cc-unit-input">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span aria-hidden="true">{unit}</span>
      </div>
      {hint && <p className="cc-hint">{hint}</p>}
      {children}
    </div>
  );
}

/** Take profit and stop loss, both optional, with where each one goes for the direction. */
export function ExitFields({
  direction,
  takeProfit,
  stopLoss,
  onTakeProfit,
  onStopLoss,
}: {
  direction: Direction;
  takeProfit: string;
  stopLoss: string;
  onTakeProfit: (value: string) => void;
  onStopLoss: (value: string) => void;
}) {
  const { t } = useI18n();
  const money = useMoney();
  return (
    <div className="cc-order-fields cc-exits">
      <UnitField
        label={t('app.crypto.order.takeProfit')}
        unit={money.symbol}
        value={takeProfit}
        onChange={onTakeProfit}
        hint={t(`app.crypto.order.takeProfitHint.${direction}`)}
      />
      <UnitField
        label={t('app.crypto.order.stopLoss')}
        unit={money.symbol}
        value={stopLoss}
        onChange={onStopLoss}
        hint={t(`app.crypto.order.stopLossHint.${direction}`)}
      />
    </div>
  );
}
