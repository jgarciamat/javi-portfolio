import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { parseDecimal } from '@shared/utils/numbers';
import { formatChange, formatQuantity, tone } from '../domain/format';
import { AMOUNT_SHARES, amountForShare, checkOpen, type OrderProblem } from '../domain/orders';
import type { Direction, OrderRequest, SimPortfolio, TradeType } from '../domain/types';
import { useMoney } from './money';
import { Help } from './Notices';

const DIRECTIONS: Direction[] = ['long', 'short'];
const TYPES: TradeType[] = ['market', 'limit', 'stop'];

/** No play money left: the history stays (and the season offers a practice portfolio). */
function EmptyCash({ practice }: { practice?: ReactNode }) {
  const { t } = useI18n();
  return (
    <p className="cc-empty-cash" role="status">
      <strong>{t('app.crypto.order.emptyCash')}</strong>{' '}
      {practice ?? t('app.crypto.order.emptyCashHint')}
    </p>
  );
}

interface OrderBoxProps {
  symbol: string;
  coinName: string;
  /** Last price in euros; null while the market data is not available. */
  price: number | null;
  portfolio: SimPortfolio;
  busy: boolean;
  onPlace: (order: OrderRequest) => Promise<boolean>;
  /** What to do when the money ran out (the official season offers a practice portfolio). */
  practice?: ReactNode;
}

function Segmented<T extends string>({
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
function UnitField({
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

interface Line {
  label: string;
  value: string;
  tone?: string;
}

/** «Before opening»: what is missing, or what it would cost and give. */
function BeforeOpening({
  problems,
  lines,
  direction,
}: {
  problems: OrderProblem[];
  lines: Line[];
  direction: Direction;
}) {
  const { t } = useI18n();
  return (
    <div className="cc-check" aria-live="polite">
      <h4>{t('app.crypto.order.check.title')}</h4>
      <ul>
        {problems.map((p) => (
          <li key={p} className="cc-check-bad">
            {t(`app.crypto.order.check.${p}.${direction}`)}
          </li>
        ))}
        {problems.length === 0 && (
          <li className="cc-check-good">{t('app.crypto.order.check.ready')}</li>
        )}
      </ul>
      {lines.length > 0 && (
        <dl>
          {lines.map((line) => (
            <div key={line.label}>
              <dt>{line.label}</dt>
              <dd className={line.tone}>{line.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Take profit and stop loss, both optional, with where each one goes for the direction. */
function ExitFields({
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

/** Title, the selected coin and its market price. */
function OrderHead({
  symbol,
  coinName,
  price,
}: {
  symbol: string;
  coinName: string;
  price: number | null;
}) {
  const { t } = useI18n();
  const money = useMoney();
  return (
    <div className="cc-order-head">
      <div>
        <h2 id="cc-order-title" className="section-title">
          {t('app.crypto.order.title')}
        </h2>
        <p className="cc-reminder">{t('app.crypto.order.reminder')}</p>
      </div>
      <dl className="cc-order-asset">
        <div>
          <dt>{t('app.crypto.order.asset')}</dt>
          <dd>
            {coinName} <small>{`${symbol} / ${money.display.currency}`}</small>
          </dd>
        </div>
        <div>
          <dt>{t('app.crypto.order.marketPrice')}</dt>
          <dd>{price === null ? '—' : money.price(price)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Capital, available, reserved, unrealised result and total value, as large figures. */
function Strips({ portfolio }: { portfolio: SimPortfolio }) {
  const { t } = useI18n();
  const money = useMoney();
  const { account, summary } = portfolio;
  const strips: [string, number | null, boolean][] = [
    ['initial', account.initial, false],
    ['cash', account.cash, false],
    ['reserved', account.reserved, false],
    ['unrealized', summary.unrealized, true],
    ['equity', summary.equity, false],
  ];
  return (
    <dl className="cc-strips">
      {strips.map(([key, value, signed]) => (
        <div key={key}>
          <dt>{t(`app.crypto.order.strips.${key}`)}</dt>
          <dd className={signed ? `cc-${tone(value)}` : undefined}>
            {value === null ? '—' : money.amount(value, signed)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The estimate lines of «Before opening», in the display currency. */
function useLines(check: ReturnType<typeof checkOpen>, symbol: string): Line[] {
  const { t, locale } = useI18n();
  const money = useMoney();
  const lines: Line[] = [];
  const result = (e: { pnl: number; percent: number }) =>
    `${money.shownAmount(e.pnl, true)} (${formatChange(e.percent, locale)})`;
  if (check.estimate) {
    lines.push(
      {
        label: t('app.crypto.order.coins', { symbol }),
        value: formatQuantity(check.estimate.quantity, locale),
      },
      {
        label: t('app.crypto.order.fee'),
        value: money.shownAmount(check.estimate.fee),
      },
      { label: t('app.crypto.order.total'), value: money.shownAmount(check.estimate.total) }
    );
  }
  if (check.liquidation !== null) {
    lines.push({
      label: t('app.crypto.order.liquidation'),
      value: money.shownPrice(check.liquidation),
    });
  }
  for (const [key, exit] of [
    ['ifTarget', check.takeProfit],
    ['ifStop', check.stopLoss],
  ] as const) {
    if (exit) {
      lines.push({
        label: t(`app.crypto.order.${key}`),
        value: result(exit),
        tone: `cc-${tone(exit.pnl)}`,
      });
    }
  }
  return lines;
}

/**
 * Opening positions with play money: long (bought, gains if the price rises) or short (sold,
 * gains if it falls), always 1x; now (market), at a limit or at a stop, with an optional take
 * profit and stop loss. Every amount is typed and shown in the chosen currency and sent in euros.
 * Positions are closed from the «Open» panel.
 */
export function OrderBox(props: OrderBoxProps) {
  const { symbol, coinName, price, portfolio, busy, onPlace, practice } = props;
  const { t } = useI18n();
  const money = useMoney();
  const [direction, setDirection] = useState<Direction>('long');
  const [type, setType] = useState<TradeType>('market');
  const [amount, setAmount] = useState('');
  const [limit, setLimit] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const { account } = portfolio;
  const bps = account.feeBps;
  const cash = money.toShown(account.cash);
  const pending = type !== 'market';
  const target = parseDecimal(limit);
  const tp = parseDecimal(takeProfit);
  const sl = parseDecimal(stopLoss);

  const check = checkOpen({
    direction,
    type,
    amount: parseDecimal(amount),
    current: price === null ? null : money.toShown(price),
    price: target,
    takeProfit: tp,
    stopLoss: sl,
    cash,
    bps,
  });
  const lines = useLines(check, symbol);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setDone(null);
    const order: OrderRequest = {
      action: 'buy',
      symbol,
      direction,
      type,
      amount: money.toBaseAmount(parseDecimal(amount)),
      ...(pending ? { price: money.toBasePrice(target) } : {}),
      ...(Number.isNaN(tp) ? {} : { takeProfit: money.toBasePrice(tp) }),
      ...(Number.isNaN(sl) ? {} : { stopLoss: money.toBasePrice(sl) }),
    };
    if (!(await onPlace(order))) return;
    setDone(t(`app.crypto.order.${pending ? 'saved' : 'opened'}.${direction}`, { coin: coinName }));
    for (const clear of [setAmount, setLimit, setTakeProfit, setStopLoss]) clear('');
  };

  return (
    <section className="card cc-order" aria-labelledby="cc-order-title">
      <OrderHead symbol={symbol} coinName={coinName} price={price} />
      <Strips portfolio={portfolio} />
      {account.cash < 1 && <EmptyCash practice={practice} />}

      <form onSubmit={(e) => void submit(e)} noValidate>
        <div className="cc-order-controls">
          <Segmented
            name="direction"
            legend={t('app.crypto.order.direction')}
            options={DIRECTIONS}
            value={direction}
            label={(o) => (
              <>
                <span aria-hidden="true">{o === 'long' ? '▲' : '▼'}</span>{' '}
                {t(`app.crypto.order.directions.${o}`)}
              </>
            )}
            title={(o) => t(`app.crypto.order.directionHint.${o}`)}
            onChange={setDirection}
          />
          <Segmented
            name="type"
            legend={t('app.crypto.order.type')}
            options={TYPES}
            value={type}
            label={(o) => t(`app.crypto.order.types.${o}`)}
            onChange={setType}
          />
        </div>
        <p className="cc-hint">{t(`app.crypto.order.directionHint.${direction}`)}</p>
        <p className="cc-helps">
          <Help term={type} label={t(`app.crypto.help.${type}`)} />
          {direction === 'short' && <Help term="short" label={t('app.crypto.help.short')} />}
        </p>

        <div className="cc-order-fields">
          <UnitField
            label={t('app.crypto.order.capital')}
            unit={money.symbol}
            value={amount}
            onChange={setAmount}
            hint={t('app.crypto.order.available', { amount: money.amount(account.cash) })}
          >
            <div className="cc-quick" role="group" aria-label={t('app.crypto.order.quick')}>
              {AMOUNT_SHARES.map((share) => (
                <button
                  key={share}
                  type="button"
                  className="cc-chip"
                  onClick={() => setAmount(String(amountForShare(cash, share, bps)))}
                >
                  {share} %
                </button>
              ))}
            </div>
          </UnitField>
          {pending ? (
            <UnitField
              label={t(`app.crypto.order.priceLabel.${direction}.${type}`)}
              unit={money.symbol}
              value={limit}
              onChange={setLimit}
            />
          ) : (
            <div className="cc-field">
              <span className="cc-label">{t('app.crypto.order.entry')}</span>
              <p className="cc-auto">
                {price === null ? '—' : money.price(price)}{' '}
                <small>{t('app.crypto.order.automatic')}</small>
              </p>
            </div>
          )}
        </div>

        <ExitFields
          direction={direction}
          takeProfit={takeProfit}
          stopLoss={stopLoss}
          onTakeProfit={setTakeProfit}
          onStopLoss={setStopLoss}
        />

        <BeforeOpening problems={check.problems} lines={lines} direction={direction} />

        <button
          type="submit"
          className={`cc-submit cc-submit--${direction}`}
          disabled={busy || check.problems.length > 0}
        >
          {t(`app.crypto.order.submit.${direction}`)}
        </button>
        {done && (
          <p className="section-success" role="status">
            {done}
          </p>
        )}
      </form>
    </section>
  );
}
