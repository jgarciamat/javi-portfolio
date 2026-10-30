import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { parseDecimal } from '@shared/utils/numbers';
import { formatChange, formatQuantity, intlTag, pnl } from '../domain/format';
import { AMOUNT_SHARES, amountForShare, checkOpen, coinSlots, feeOf } from '../domain/orders';
import type {
  Direction,
  OrderRequest,
  RecordRequest,
  SimFill,
  SimPortfolio,
  TradeType,
} from '../domain/types';
import { useMoney } from './money';
import { Help } from './Notices';
import { ExitFields, Segmented, UnitField } from './OrderFields';
import { RecordForm } from './RecordTrade';

const DIRECTIONS: Direction[] = ['long', 'short'];
const TYPES: TradeType[] = ['market', 'limit', 'stop'];
/** A practice portfolio also takes trades opened somewhere else, at the entry the person gives. */
type Mode = 'order' | 'record';
const MODES: Mode[] = ['order', 'record'];

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
  /** Opens the guide on its words tab (the entry «What is the commission?»). */
  onGuide: () => void;
  /** What to do when the money ran out (the official season offers a practice portfolio). */
  practice?: ReactNode;
  /** «Register a trade I already opened» (practice portfolios only). */
  onRecord?: (trade: RecordRequest) => Promise<SimFill[] | null>;
}

interface Line {
  label: string;
  value: string;
  tone?: string;
}

/** «Before opening»: what is missing, or what it would cost and give. */
function BeforeOpening({
  check,
  symbol,
  direction,
  bps,
  onGuide,
}: {
  check: ReturnType<typeof checkOpen>;
  symbol: string;
  direction: Direction;
  bps: number;
  onGuide: () => void;
}) {
  const { t } = useI18n();
  const lines = useLines(check, symbol);
  return (
    <div className="cc-check" aria-live="polite">
      <h4>{t('app.crypto.order.check.title')}</h4>
      <ul>
        {check.problems.map((p) => (
          <li key={p} className="cc-check-bad">
            {t(`app.crypto.order.check.${p}.${direction}`)}
          </li>
        ))}
        {check.problems.length === 0 && (
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
      {check.estimate && <FeeInfo fee={check.estimate.fee} bps={bps} onGuide={onGuide} />}
    </div>
  );
}

/**
 * The commission of the operation, in plain words: how much it is on opening (and about the same
 * on closing), what kind it is, why it exists and a made-up example. The percentage is the fixed
 * one of the server (`FIXED_FEE_BPS`); on closing it applies to the value at that moment.
 */
function FeeInfo({ fee, bps, onGuide }: { fee: number; bps: number; onGuide: () => void }) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const [open, setOpen] = useState(false);
  const id = useId();
  const percent = new Intl.NumberFormat(intlTag(locale), { maximumFractionDigits: 2 }).format(
    bps / 100
  );
  const example = feeOf(1000, bps);
  return (
    <div className="cc-fee">
      <p className="cc-fee-line">
        {t('app.crypto.order.fee.line', {
          open: money.shownAmount(fee),
          percent,
          close: money.shownAmount(fee),
        })}
      </p>
      <button
        type="button"
        className="btn-link cc-fee-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        {t('app.crypto.order.fee.toggle')}
      </button>
      <div id={id} className="cc-fee-body" hidden={!open}>
        <p>
          <strong>{t('app.crypto.order.fee.typeTitle')}</strong>{' '}
          {t('app.crypto.order.fee.type', { percent })}
        </p>
        <p>
          <strong>{t('app.crypto.order.fee.whyTitle')}</strong> {t('app.crypto.order.fee.why')}
        </p>
        <p>{t('app.crypto.order.fee.simulated')}</p>
        <p>
          {t('app.crypto.order.fee.example', {
            amount: money.shownAmount(1000),
            fee: money.shownAmount(example),
            total: money.shownAmount(example * 2),
          })}
        </p>
        <button type="button" className="btn-link" onClick={onGuide}>
          {t('app.crypto.order.fee.guide')}
        </button>
      </div>
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
  // [key, value, signed, the result that colours it (the total value against the capital)]
  const strips: [string, number | null, boolean, number | null | undefined][] = [
    ['initial', account.initial, false, undefined],
    ['cash', account.cash, false, undefined],
    ['reserved', account.reserved, false, undefined],
    ['unrealized', summary.unrealized, true, summary.unrealized],
    [
      'equity',
      summary.equity,
      false,
      summary.equity === null ? null : summary.equity - account.initial,
    ],
  ];
  return (
    <dl className="cc-strips">
      {strips.map(([key, value, signed, result]) => (
        <div key={key}>
          <dt>{t(`app.crypto.order.strips.${key}`)}</dt>
          <dd className={result === undefined ? undefined : pnl(result)}>
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
        tone: pnl(exit.pnl),
      });
    }
  }
  return lines;
}

/**
 * Below the button, once the coin has operations under way: which number the new one will take
 * («esta será la #2»), or why the button is off (two of two). Read out with the button.
 */
function SlotNote({
  id,
  symbol,
  slots,
}: {
  id: string;
  symbol: string;
  slots: ReturnType<typeof coinSlots>;
}) {
  const { t } = useI18n();
  return (
    <p id={id} className={`cc-slot-note${slots.full ? ' is-full' : ''}`} aria-live="polite">
      {slots.used === 0
        ? null
        : t(`app.crypto.order.slots.${slots.full ? 'full' : 'next'}`, {
            used: slots.used,
            max: slots.max,
            symbol,
            next: slots.next,
          })}
    </p>
  );
}

/**
 * Opening positions with play money: long (bought, gains if the price rises) or short (sold,
 * gains if it falls), always 1x; now (market), at a limit or at a stop, with an optional take
 * profit and stop loss. Every amount is typed and shown in the chosen currency and sent in euros.
 * Positions are closed from the «Open» panel.
 */
export function OrderBox(props: OrderBoxProps) {
  const { symbol, coinName, price, portfolio, busy, onRecord } = props;
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('order');
  const recording = !!onRecord && portfolio.portfolio.kind === 'practice';
  return (
    <section className="card cc-order" aria-labelledby="cc-order-title">
      <OrderHead symbol={symbol} coinName={coinName} price={price} />
      <Strips portfolio={portfolio} />
      {portfolio.account.cash < 1 && <EmptyCash practice={props.practice} />}
      {recording && (
        <Segmented
          name="mode"
          legend={t('app.crypto.record.mode')}
          options={MODES}
          value={mode}
          label={(o) => t(`app.crypto.record.modes.${o}`)}
          onChange={setMode}
        />
      )}
      {recording && mode === 'record' ? (
        <RecordForm
          symbol={symbol}
          coinName={coinName}
          price={price}
          portfolio={portfolio}
          busy={busy}
          onRecord={onRecord}
        />
      ) : (
        <OrderForm {...props} />
      )}
    </section>
  );
}

/** A new order against the market: now, at a limit or at a stop. */
function OrderForm(props: OrderBoxProps) {
  const { symbol, coinName, price, portfolio, busy, onPlace, onGuide } = props;
  const { t } = useI18n();
  const money = useMoney();
  const [direction, setDirection] = useState<Direction>('long');
  const [type, setType] = useState<TradeType>('market');
  const [amount, setAmount] = useState('');
  const [limit, setLimit] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const noteId = useId();
  const { account } = portfolio;
  // Two operations of a coin at once at most, numbered #1 and #2 (the server checks it again).
  const slots = coinSlots(portfolio, symbol);
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

      <BeforeOpening {...{ check, symbol, direction, bps, onGuide }} />

      <button
        type="submit"
        className={`cc-submit cc-submit--${direction}`}
        disabled={busy || check.problems.length > 0 || slots.full}
        aria-describedby={slots.used > 0 ? noteId : undefined}
      >
        {t(`app.crypto.order.submit.${direction}`)}
      </button>
      <SlotNote id={noteId} symbol={symbol} slots={slots} />
      {done && (
        <p className="section-success" role="status">
          {done}
        </p>
      )}
    </form>
  );
}
