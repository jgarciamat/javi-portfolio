import { useId, useState, type FormEvent } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { parseDecimal } from '@shared/utils/numbers';
import { formatChange, formatDateTime, formatQuantity, pnl } from '../domain/format';
import {
  AMOUNT_SHARES,
  RECORDED_MAX_DAYS,
  amountForShare,
  checkRecord,
  coinSlots,
  withSlot,
} from '../domain/orders';
import type { Direction, RecordRequest, SimFill, SimPortfolio } from '../domain/types';
import { useMoney, type Money } from './money';
import { ExitFields, Segmented, UnitField } from './OrderFields';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

const DIRECTIONS: Direction[] = ['long', 'short'];
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');
/** A moment as a `datetime-local` field writes it, in the device's time («2026-03-15T10:30»). */
export const toLocalInput = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** The take profit, stop loss or guarantee that closed the new position while it was replayed. */
export function closingFill(fills: SimFill[], symbol: string, slot: number): SimFill | null {
  return (
    fills.find(
      (f) =>
        f.symbol === symbol &&
        f.slot === slot &&
        f.type !== 'expired' &&
        (f.side === 'buy') !== (f.direction === 'long')
    ) ?? null
  );
}

/**
 * What registering said: entered and open (its result follows the price), or already closed by
 * its take profit, stop loss or guarantee somewhere since the moment of entry (and when both
 * were reached in one candle, that the prudent one was taken).
 */
export function recordedText(
  closed: SimFill | null,
  vars: { coin: string; direction: Direction; entry: string },
  t: Translate,
  money: Pick<Money, 'price'>,
  at: (iso: string) => string
): string {
  if (!closed) {
    return t(`app.crypto.record.done.${vars.direction}`, { coin: vars.coin, price: vars.entry });
  }
  const text = t(`app.crypto.record.doneClosed.${closed.type}`, {
    coin: vars.coin,
    price: money.price(closed.price!),
    at: at(closed.at),
  });
  return closed.sameCandle ? `${text} ${t('app.crypto.fills.sameCandle')}` : text;
}

/** When it was opened: empty is now; a past moment is checked against the candles since then. */
function OpenedAtField({
  value,
  now,
  onChange,
}: {
  value: string;
  now: number;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="cc-field">
      <label className="cc-label" htmlFor={id}>
        {t('app.crypto.record.openedAt')}
      </label>
      <div className="cc-record-time">
        <input
          id={id}
          type="datetime-local"
          value={value}
          min={toLocalInput(now - RECORDED_MAX_DAYS * DAY_MS)}
          max={toLocalInput(now)}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button type="button" className="cc-chip" onClick={() => onChange('')}>
            {t('app.crypto.record.now')}
          </button>
        )}
      </div>
      <p className="cc-hint">
        {t(value ? 'app.crypto.record.pastHint' : 'app.crypto.record.nowHint', {
          days: RECORDED_MAX_DAYS,
        })}
      </p>
    </div>
  );
}

/** «Before registering»: what is missing, a far entry pointed out, and its figures. */
function RecordCheckBox({
  check,
  symbol,
  direction,
}: {
  check: ReturnType<typeof checkRecord>;
  symbol: string;
  direction: Direction;
}) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const result = (e: { pnl: number; percent: number }) =>
    `${money.shownAmount(e.pnl, true)} (${formatChange(e.percent, locale)})`;
  const lines: [string, string, string?][] = [];
  if (check.estimate) {
    lines.push(
      [t('app.crypto.order.coins', { symbol }), formatQuantity(check.estimate.quantity, locale)],
      [t('app.crypto.order.total'), money.shownAmount(check.estimate.total)]
    );
  }
  if (check.liquidation !== null) {
    lines.push([t('app.crypto.order.liquidation'), money.shownPrice(check.liquidation)]);
  }
  for (const [key, e] of [
    ['record.nowResult', check.now],
    ['order.ifTarget', check.takeProfit],
    ['order.ifStop', check.stopLoss],
  ] as const) {
    if (e) lines.push([t(`app.crypto.${key}`), result(e), pnl(e.pnl)]);
  }
  return (
    <div className="cc-check" aria-live="polite">
      <h4>{t('app.crypto.record.check')}</h4>
      <ul>
        {check.problems.map((p) => (
          <li key={p} className="cc-check-bad">
            {t(`app.crypto.record.problem.${p}.${direction}`, { days: RECORDED_MAX_DAYS })}
          </li>
        ))}
        {check.problems.length === 0 && (
          <li className="cc-check-good">{t('app.crypto.order.check.ready')}</li>
        )}
        {check.far && <li className="cc-check-warn">{t('app.crypto.record.far')}</li>}
      </ul>
      {lines.length > 0 && (
        <dl>
          {lines.map(([label, value, tone]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd className={tone}>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="cc-hint">{t('app.crypto.record.fee')}</p>
    </div>
  );
}

interface RecordFormProps {
  symbol: string;
  coinName: string;
  /** Last price in euros; null while the market data is not available. */
  price: number | null;
  portfolio: SimPortfolio;
  busy: boolean;
  /** The fills of the answer (an exit reached since the entry), or null when it was refused. */
  onRecord: (trade: RecordRequest) => Promise<SimFill[] | null>;
}

/** The fields of the form, as typed, and the request they make (amounts in euros). */
function useRecordFields() {
  const money = useMoney();
  const [direction, setDirection] = useState<Direction>('long');
  const [entry, setEntry] = useState('');
  const [amount, setAmount] = useState('');
  const [openedAt, setOpenedAt] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const values = {
    entry: parseDecimal(entry),
    amount: parseDecimal(amount),
    takeProfit: parseDecimal(takeProfit),
    stopLoss: parseDecimal(stopLoss),
    openedAt: openedAt ? new Date(openedAt).getTime() : null,
  };
  const request = (symbol: string): RecordRequest => ({
    symbol,
    direction,
    entryPrice: money.toBasePrice(values.entry),
    amount: money.toBaseAmount(values.amount),
    ...(Number.isNaN(values.takeProfit)
      ? {}
      : { takeProfit: money.toBasePrice(values.takeProfit) }),
    ...(Number.isNaN(values.stopLoss) ? {} : { stopLoss: money.toBasePrice(values.stopLoss) }),
    ...(values.openedAt === null ? {} : { openedAt: new Date(values.openedAt).toISOString() }),
  });
  const clear = () => {
    for (const set of [setEntry, setAmount, setOpenedAt, setTakeProfit, setStopLoss]) set('');
  };
  return {
    text: { entry, amount, openedAt, takeProfit, stopLoss },
    set: { setDirection, setEntry, setAmount, setOpenedAt, setTakeProfit, setStopLoss },
    direction,
    values,
    request,
    clear,
  };
}

/**
 * «Register a trade I already opened» (practice portfolios only): a position at the entry price
 * the person chooses (a trade made in another exchange, or «what if I had entered at…»), with its
 * amount, take profit and stop loss and, optionally, the moment it was opened. Play money: no
 * order is sent anywhere. Once registered it is an ordinary open position whose result follows
 * the price.
 */
export function RecordForm({
  symbol,
  coinName,
  price,
  portfolio,
  busy,
  onRecord,
}: RecordFormProps) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const fields = useRecordFields();
  const { text, set, direction, values } = fields;
  const [done, setDone] = useState<string | null>(null);
  const { account } = portfolio;
  const slots = coinSlots(portfolio, symbol);
  const cash = money.toShown(account.cash);
  const current = price === null ? null : money.toShown(price);
  const now = Date.now();
  const check = checkRecord({
    ...values,
    direction,
    current,
    cash,
    bps: account.feeBps,
    now,
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setDone(null);
    const slot = slots.next;
    const fills = await onRecord(fields.request(symbol));
    if (!fills) return;
    setDone(
      recordedText(
        closingFill(fills, symbol, slot),
        { coin: withSlot(symbol, slot), direction, entry: money.shownPrice(values.entry) },
        t,
        money,
        (iso) => formatDateTime(iso, locale)
      )
    );
    fields.clear();
  };

  return (
    <form className="cc-record" onSubmit={(e) => void submit(e)} noValidate>
      <p className="cc-record-intro">{t('app.crypto.record.intro', { coin: coinName })}</p>
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
        onChange={set.setDirection}
      />
      <div className="cc-order-fields">
        <UnitField
          label={t('app.crypto.record.entry')}
          unit={money.symbol}
          value={text.entry}
          onChange={set.setEntry}
          hint={
            current === null
              ? undefined
              : t('app.crypto.record.entryHint', { price: money.shownPrice(current) })
          }
        >
          {current !== null && (
            <button type="button" className="cc-chip" onClick={() => set.setEntry(String(current))}>
              {t('app.crypto.record.useCurrent')}
            </button>
          )}
        </UnitField>
        <UnitField
          label={t('app.crypto.order.capital')}
          unit={money.symbol}
          value={text.amount}
          onChange={set.setAmount}
          hint={t('app.crypto.order.available', { amount: money.amount(account.cash) })}
        >
          <div className="cc-quick" role="group" aria-label={t('app.crypto.order.quick')}>
            {AMOUNT_SHARES.map((share) => (
              <button
                key={share}
                type="button"
                className="cc-chip"
                onClick={() => set.setAmount(String(amountForShare(cash, share, account.feeBps)))}
              >
                {share} %
              </button>
            ))}
          </div>
        </UnitField>
        <OpenedAtField value={text.openedAt} now={now} onChange={set.setOpenedAt} />
      </div>

      <ExitFields
        direction={direction}
        takeProfit={text.takeProfit}
        stopLoss={text.stopLoss}
        onTakeProfit={set.setTakeProfit}
        onStopLoss={set.setStopLoss}
      />

      <RecordCheckBox check={check} symbol={symbol} direction={direction} />

      <button
        type="submit"
        className={`cc-submit cc-submit--${direction}`}
        disabled={busy || check.problems.length > 0 || slots.full}
      >
        {t('app.crypto.record.submit')}
      </button>
      {slots.full && (
        <p className="cc-slot-note is-full">
          {t('app.crypto.order.slots.full', { used: slots.used, max: slots.max, symbol })}
        </p>
      )}
      {done && (
        <p className="section-success" role="status">
          {done}
        </p>
      )}
    </form>
  );
}
