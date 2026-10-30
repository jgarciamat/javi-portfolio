import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { parseDecimal } from '@shared/utils/numbers';
import { formatChange, formatDateTime, formatQuantity, pnl } from '../domain/format';
import {
  exitProblem,
  exitResult,
  needsRise,
  openBreakdown,
  withSlot,
  type ExitKind,
} from '../domain/orders';
import type {
  ClosedTrade,
  Direction,
  ExitsRequest,
  OpenTrade,
  OrderRequest,
  PendingOrder,
  Slot,
} from '../domain/types';
import type { AccountTransfer } from '../application/useAccountTransfer';
import { AddToAccount } from './AddToAccount';
import { useMoney } from './money';
import { Help } from './Notices';

type Place = (order: OrderRequest) => Promise<boolean>;
type SetExits = (positionId: string, exits: ExitsRequest) => Promise<boolean>;
type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** Operations per page in each panel (open, pending and closed). */
export const PAGE_SIZE = 10;
/** How long «Close trade» waits for the second press that confirms it. */
export const CONFIRM_MS = 4_000;

/** «▲ Long» / «▼ Short», with its colour: the words say it, the colour only backs them up. */
export function DirectionBadge({ direction }: { direction: Direction }) {
  const { t } = useI18n();
  return (
    <span className={`cc-dir cc-dir--${direction}`}>
      <span aria-hidden="true">{direction === 'long' ? '▲' : '▼'}</span>{' '}
      {t(`app.crypto.order.directionShort.${direction}`)}
    </span>
  );
}

/**
 * «#1» / «#2» beside the coin: the number of the operation, the same one its lines carry on the
 * chart. The second one is drawn apart (dashed, like its lines), and the number is read out in
 * words.
 */
export function SlotBadge({ slot }: { slot: Slot }) {
  const { t } = useI18n();
  if (!slot) return null;
  return (
    <span className={`cc-slot cc-slot--${slot % 2 ? 'odd' : 'even'}`}>
      <span aria-hidden="true">#{slot}</span>
      <span className="sr-only">{t('app.crypto.slot.label', { n: slot })}</span>
    </span>
  );
}

/** What a pending order does, in words: «Open a long (limit)», «Open a short (stop)». */
export function orderKind(o: Pick<PendingOrder, 'direction' | 'type'>, t: Translate) {
  return t(`app.crypto.trades.kind.open.${o.direction}.${o.type}`);
}

/**
 * The rows of a page. The page is kept when the data refreshes and goes back to the last one
 * that exists when rows disappear.
 */
export function usePage<T>(rows: T[], size = PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages - 1);
  useEffect(() => {
    if (page !== current) setPage(current);
  }, [page, current]);
  return { page: current, pages, rows: rows.slice(current * size, (current + 1) * size), setPage };
}

/** «Prev.» / «Next» with «Page X of Y» in between, only when there is more than one page. */
function Pager({
  label,
  page,
  pages,
  onPage,
}: {
  label: string;
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  const { t } = useI18n();
  if (pages < 2) return null;
  const button = (to: number, key: 'prev' | 'next', disabled: boolean) => (
    <button type="button" disabled={disabled} onClick={() => onPage(to)}>
      {t(`app.crypto.trades.pager.${key}`)}
      <span className="sr-only"> {t(`app.crypto.trades.pager.${key}Page`)}</span>
    </button>
  );
  return (
    <nav className="cc-pager" aria-label={label}>
      {button(page - 1, 'prev', page === 0)}
      <span aria-live="polite">{t('app.crypto.trades.pager.page', { page: page + 1, pages })}</span>
      {button(page + 1, 'next', page >= pages - 1)}
    </nav>
  );
}

function Result({ pnl: value, percent }: { pnl: number; percent: number }) {
  const { locale } = useI18n();
  const money = useMoney();
  return (
    <b className={pnl(value)}>
      {money.amount(value, true)} ({formatChange(percent, locale)})
    </b>
  );
}

/** The result as a headline: the amount big, its percent below (the colour says up or down). */
function BigResult({ pnl: value, percent }: { pnl: number | null; percent: number | null }) {
  const { locale } = useI18n();
  const money = useMoney();
  if (value === null || percent === null) return <b className={`cc-big ${pnl(null)}`}>—</b>;
  return (
    <>
      <b className={`cc-big ${pnl(value)}`}>{money.amount(value, true)}</b>
      <span className={`cc-sub-pct ${pnl(value)}`}>{formatChange(percent, locale)}</span>
    </>
  );
}

type Role = 'who' | 'prices' | 'amount' | 'middle' | 'end' | 'actions';

/**
 * A cell of a row. Its label shows above it on narrow screens and is read aloud always; on wide
 * ones the column headers (once, over the list) say it.
 */
function Cell({ role, label, children }: { role: Role; label?: string; children: ReactNode }) {
  return (
    <div className={`cc-cell cc-cell--${role}`}>
      {label && <span className="cc-cell-label">{label}</span>}
      {children}
    </div>
  );
}

/** A small label and its value on one line: «Entrada 64.207,24 €». */
function Mini({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="cc-mini">
      <small>{label}</small> <span>{children}</span>
    </span>
  );
}

/**
 * The column headers, once over the list (decorative: every cell carries its own label for
 * screen readers). Hidden on narrow screens, where each cell shows its label instead.
 */
function ColumnHeads({ kind, keys }: { kind: 'open' | 'pending' | 'closed'; keys: string[] }) {
  const { t } = useI18n();
  return (
    <div className={`cc-trade-cols cc-trade-cols--${kind}`} aria-hidden="true">
      {keys.map((key) => (
        <span key={key}>{key && t(`app.crypto.trades.cols.${key}`)}</span>
      ))}
    </div>
  );
}

/** «▾ Details» (needs its own id): opens the second line of a row. */
function DetailsToggle({
  open,
  controls,
  which,
  onToggle,
}: {
  open: boolean;
  controls: string;
  which: string;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="cc-tool cc-details-toggle"
      title={t('app.crypto.trades.details.label')}
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
    >
      <span aria-hidden="true" className="cc-chevron">
        {open ? '▴' : '▾'}
      </span>
      <span className="cc-details-text">{t('app.crypto.trades.details.label')}</span>
      <span className="sr-only"> {which}</span>
    </button>
  );
}

/** The take profit (green) and the stop loss (red) as two short lines: price and distance. */
function ExitLines({
  exits,
  current,
}: {
  exits: Partial<Record<ExitKind, number>>;
  current: number | null | undefined;
}) {
  const { t, locale } = useI18n();
  const money = useMoney();
  return (
    <dl className="cc-exit-lines">
      {EXITS.map(({ kind }) => {
        const price = exits[kind];
        return (
          <div key={kind} className={`cc-exit cc-exit--${kind}`}>
            <dt>
              <span aria-hidden="true">{t(`app.crypto.trades.facts.${kind}Short`)}</span>
              <span className="sr-only">{t(`app.crypto.trades.facts.${kind}`)}</span>
            </dt>
            {price === undefined ? (
              <dd>—</dd>
            ) : (
              <dd>
                <b className="cc-exit-price">{money.price(price)}</b>
                {current != null && (
                  <small>{formatChange(((price - current) / current) * 100, locale)}</small>
                )}
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}

const EXITS: { kind: ExitKind; type: PendingOrder['type'] }[] = [
  { kind: 'takeProfit', type: 'limit' },
  { kind: 'stopLoss', type: 'stop' },
];

/** The price of a take profit or stop loss as it goes in its box (display currency). */
const inputValue = (shown: number) => String(Number(shown.toPrecision(10)));

/**
 * What closing at the take profit or the stop loss would give: how far each is from the current
 * price, which way the price must go and the result if reached. Only the ones that are set.
 */
function ExitDetails({
  trade,
  exits,
  bps,
}: {
  trade: OpenTrade;
  exits: Partial<Record<ExitKind, number>>;
  bps: number;
}) {
  const { t, locale } = useI18n();
  return (
    <>
      {EXITS.map(({ kind }) => {
        const price = exits[kind];
        if (price === undefined) return null;
        const result = exitResult(trade, price, bps);
        const rise = needsRise(trade.direction, kind);
        return (
          <div key={kind} className={`cc-exit cc-exit--${kind}`}>
            <dt>{t(`app.crypto.trades.facts.${kind}`)}</dt>
            <dd>
              {trade.currentPrice === null
                ? '—'
                : t('app.crypto.trades.exits.distance', {
                    percent: formatChange(
                      ((price - trade.currentPrice) / trade.currentPrice) * 100,
                      locale
                    ),
                  })}{' '}
              <small
                className="cc-exit-way"
                title={t(`app.crypto.trades.exits.way.${rise ? 'rise' : 'fall'}.title`)}
              >
                {t(`app.crypto.trades.exits.way.${rise ? 'rise' : 'fall'}`)}
              </small>
              <span>
                {t('app.crypto.trades.exits.ifReached')}{' '}
                <Result pnl={result.pnl} percent={result.percent} />
              </span>
            </dd>
          </div>
        );
      })}
    </>
  );
}

/**
 * Changing the take profit and stop loss of an open position: an empty box removes it. Checked
 * live against the current price (a long's take profit above it and its stop loss below; a
 * short's, the other way round) and again by the server. Only what changed is sent.
 */
function ExitsForm({
  trade,
  exits,
  busy,
  onSave,
  onDone,
}: {
  trade: OpenTrade;
  exits: Partial<Record<ExitKind, number>>;
  busy: boolean;
  onSave: SetExits;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const id = useId();
  const initial = (kind: ExitKind) => {
    const price = exits[kind];
    return price === undefined ? '' : inputValue(money.toShown(price));
  };
  const [values, setValues] = useState({
    takeProfit: initial('takeProfit'),
    stopLoss: initial('stopLoss'),
  });
  const current = trade.currentPrice === null ? null : money.toShown(trade.currentPrice);
  const priceOf = (kind: ExitKind) =>
    values[kind].trim() === '' ? null : parseDecimal(values[kind]);
  const problems = EXITS.flatMap(({ kind }) => {
    const problem = exitProblem(trade.direction, kind, priceOf(kind), current);
    if (!problem) return [];
    return [
      problem === 'price'
        ? t('app.crypto.trades.exits.check.price', {
            name: t(`app.crypto.trades.facts.${kind}`),
          })
        : t(`app.crypto.trades.exits.check.${kind}.${trade.direction}`),
    ];
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const changes: ExitsRequest = {};
    for (const { kind } of EXITS) {
      if (values[kind].trim() === initial(kind)) continue;
      const price = priceOf(kind);
      changes[kind] = price === null ? null : money.toBasePrice(price);
    }
    if (Object.keys(changes).length === 0 || (await onSave(trade.id, changes))) onDone();
  };

  return (
    <form className="cc-exits-form" onSubmit={(e) => void submit(e)} noValidate>
      <p className="cc-hint">{t('app.crypto.trades.exits.formHint')}</p>
      <div className="cc-exits-fields">
        {EXITS.map(({ kind }) => (
          <div key={kind} className={`cc-field cc-exit--${kind}`}>
            <label className="cc-label" htmlFor={`${id}-${kind}`}>
              {t(`app.crypto.trades.exits.label.${kind}`, { symbol: money.symbol })}
            </label>
            <div className="cc-unit-input">
              <input
                id={`${id}-${kind}`}
                inputMode="decimal"
                value={values[kind]}
                onChange={(e) => setValues((v) => ({ ...v, [kind]: e.target.value }))}
              />
              <span aria-hidden="true">{money.symbol}</span>
            </div>
          </div>
        ))}
      </div>
      <div aria-live="polite">
        {problems.map((problem) => (
          <p key={problem} className="form-error">
            {problem}
          </p>
        ))}
      </div>
      <div className="button-row">
        <button
          type="submit"
          className="cc-tool cc-tool--strong"
          disabled={busy || problems.length > 0}
        >
          {t('app.crypto.trades.exits.save')}
        </button>
        <button type="button" className="cc-tool" onClick={onDone}>
          {t('app.crypto.trades.exits.cancel')}
        </button>
      </div>
    </form>
  );
}

/**
 * «Close trade»: at market, now, at the last price (its take profit and stop loss go with it and
 * the commission applies). A light confirmation: the first press turns the button into «Sure? Yes,
 * close» for a few seconds; the second one closes.
 */
function CloseTrade({
  trade,
  busy,
  onClose,
}: {
  trade: OpenTrade;
  busy: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [armed]);
  const which = t('app.crypto.trades.close.which', {
    coin: withSlot(trade.symbol, trade.slot),
    direction: t(`app.crypto.order.directionShort.${trade.direction}`),
  });
  return (
    <>
      <button
        type="button"
        className={`cc-tool cc-close${armed ? ' cc-close--armed' : ''}`}
        disabled={busy || trade.currentPrice === null}
        title={t('app.crypto.trades.close.title')}
        onClick={() => {
          setArmed(!armed);
          if (armed) onClose();
        }}
      >
        <span aria-hidden="true">
          {t(armed ? 'app.crypto.trades.close.confirm' : 'app.crypto.trades.close.short')}
        </span>
        <span className="sr-only">
          {t(armed ? 'app.crypto.trades.close.confirm' : 'app.crypto.trades.close.label')} {which}
        </span>
      </button>
      <span className="sr-only" aria-live="polite">
        {armed && <span>{t('app.crypto.trades.close.armed', { seconds: CONFIRM_MS / 1000 })}</span>}
        {armed && trade.exitFee !== null && (
          <span> {t('app.crypto.trades.close.fee', { fee: money.amount(trade.exitFee) })}</span>
        )}
      </span>
    </>
  );
}

/**
 * Why the result is what it is (second line of a row): what the price gives, the commissions and
 * the net result. When the price already favours the person but the commissions are not covered
 * yet, a short sentence says so instead of leaving a red number unexplained.
 */
function Breakdown({ trade }: { trade: OpenTrade }) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const parts = openBreakdown(trade);
  if (parts === null) return null;
  const rows: [string, string, string][] = [
    ['price', money.amount(parts.price, true), pnl(parts.price)],
    ['fees', money.amount(-parts.fees, true), ''],
    [
      'net',
      `${money.amount(parts.net, true)} (${formatChange(trade.pnlPercent!, locale)})`,
      pnl(parts.net),
    ],
  ];
  return (
    <>
      {rows.map(([key, text, tone]) => (
        <div key={key} className="cc-breakdown-row">
          <dt>{t(`app.crypto.trades.breakdown.${key}`)}</dt>
          <dd className={tone || undefined}>{text}</dd>
        </div>
      ))}
      {parts.price > 0 && parts.net < 0 && (
        <p className="cc-hint cc-detail-note">{t('app.crypto.trades.breakdown.feesNotCovered')}</p>
      )}
    </>
  );
}

const OPEN_COLS = ['position', 'prices', 'amount', 'exits', 'result', ''];
const PENDING_COLS = ['position', 'prices', 'reserved', 'exits', 'dates', ''];
const CLOSED_COLS = ['position', 'prices', 'amount', 'closing', 'result'];

/**
 * One open trade, in one row: direction, coin, quantity and date · entry and now · amount · take
 * profit and stop loss · net result · buttons. What is secondary (what closing would give, the
 * price that closes it alone, the breakdown of the result) opens in a second line, like the
 * take profit and stop loss form.
 */
function OpenCard({
  trade,
  orders,
  bps,
  busy,
  onClose,
  onSetExits,
}: {
  trade: OpenTrade;
  orders: PendingOrder[];
  bps: number;
  busy: boolean;
  onClose: () => void;
  onSetExits: SetExits;
}) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState(false);
  const exits: Partial<Record<ExitKind, number>> = {};
  for (const { kind, type } of EXITS) {
    const order = orders.find((o) => o.type === type);
    if (order) exits[kind] = order.price;
  }
  const breakdown = openBreakdown(trade);
  const which = t('app.crypto.trades.close.which', {
    coin: withSlot(trade.symbol, trade.slot),
    direction: t(`app.crypto.order.directionShort.${trade.direction}`),
  });
  return (
    <li className={`cc-trade cc-trade--open cc-trade--${trade.direction}`}>
      <Cell role="who" label={t('app.crypto.trades.cols.position')}>
        <span className="cc-who">
          <DirectionBadge direction={trade.direction} />
          <b>{trade.symbol}</b>
          <SlotBadge slot={trade.slot} />
        </span>
        <small className="cc-sub">
          {formatQuantity(trade.quantity, locale)} · {formatDateTime(trade.openedAt, locale)}
        </small>
      </Cell>
      <Cell role="prices" label={t('app.crypto.trades.cols.prices')}>
        <Mini label={t('app.crypto.trades.facts.entry')}>{money.price(trade.entryPrice)}</Mini>
        <Mini label={t('app.crypto.trades.facts.nowShort')}>
          {trade.currentPrice === null ? '—' : money.price(trade.currentPrice)}
        </Mini>
      </Cell>
      <Cell role="amount" label={t('app.crypto.trades.cols.amount')}>
        <span>{money.amount(trade.invested)}</span>
        <small className="cc-sub">
          +{money.amount(trade.entryFee)} {t('app.crypto.trades.feeWord')}
        </small>
      </Cell>
      <Cell role="middle" label={t('app.crypto.trades.cols.exits')}>
        <ExitLines exits={exits} current={trade.currentPrice} />
      </Cell>
      <Cell role="end" label={t('app.crypto.trades.cols.result')}>
        <BigResult pnl={trade.pnl} percent={trade.pnlPercent} />
        {breakdown && (
          <small className="cc-sub">
            <span className={pnl(breakdown.price)}>
              {t('app.crypto.trades.breakdown.priceShort', {
                amount: money.amount(breakdown.price, true),
              })}
            </span>
            {' · '}
            {t('app.crypto.trades.breakdown.feesShort', {
              amount: money.amount(-breakdown.fees, true),
            })}
          </small>
        )}
      </Cell>
      <div className="cc-cell cc-cell--actions">
        <CloseTrade trade={trade} busy={busy} onClose={onClose} />
        <button
          type="button"
          className="cc-tool"
          aria-expanded={editing}
          onClick={() => setEditing((v) => !v)}
        >
          {t('app.crypto.trades.exits.edit')}
          <span className="sr-only"> {which}</span>
        </button>
        <DetailsToggle
          open={details}
          controls={`${id}-details`}
          which={which}
          onToggle={() => setDetails((v) => !v)}
        />
      </div>
      {details && (
        <dl id={`${id}-details`} className="cc-detail">
          <div>
            <dt>{t('app.crypto.trades.facts.ifClosed')}</dt>
            <dd>{trade.value === null ? '—' : money.amount(trade.value)}</dd>
          </div>
          {trade.liquidationPrice !== null && (
            <div>
              <dt>{t('app.crypto.trades.facts.liquidation')}</dt>
              <dd>{money.price(trade.liquidationPrice)}</dd>
            </div>
          )}
          <ExitDetails trade={trade} exits={exits} bps={bps} />
          <Breakdown trade={trade} />
        </dl>
      )}
      {editing && (
        <ExitsForm
          trade={trade}
          exits={exits}
          busy={busy}
          onSave={onSetExits}
          onDone={() => setEditing(false)}
        />
      )}
    </li>
  );
}

export function OpenPanel({
  trades,
  pending,
  bps,
  busy,
  onPlace,
  onSetExits,
}: {
  trades: OpenTrade[];
  pending: PendingOrder[];
  bps: number;
  busy: boolean;
  onPlace: Place;
  onSetExits: SetExits;
}) {
  const { t } = useI18n();
  const page = usePage(trades);
  const [done, setDone] = useState<string | null>(null);
  const close = async (trade: OpenTrade) => {
    setDone(null);
    if (await onPlace({ action: 'sell', positionId: trade.id, type: 'market' })) {
      setDone(t('app.crypto.trades.close.done', { coin: withSlot(trade.symbol, trade.slot) }));
    }
  };
  return (
    <section className="card cc-panel" aria-labelledby="cc-open-title">
      <h2 id="cc-open-title" className="section-title">
        {t('app.crypto.trades.openTitle', { count: trades.length })}
      </h2>
      <p className="cc-helps">
        <Help term="unrealized" label={t('app.crypto.help.unrealized')} />
        <Help term="takeProfit" label={t('app.crypto.help.takeProfit')} />
        <Help term="stopLoss" label={t('app.crypto.help.stopLoss')} />
      </p>
      <p className="cc-done" role="status">
        {done}
      </p>
      {trades.length === 0 ? (
        <p className="cc-hint">{t('app.crypto.trades.openEmpty')}</p>
      ) : (
        <div className="cc-table">
          <ColumnHeads kind="open" keys={OPEN_COLS} />
          <ul className="cc-trades">
            {page.rows.map((trade) => (
              <OpenCard
                key={trade.id}
                trade={trade}
                orders={pending.filter((o) => o.positionId === trade.id)}
                bps={bps}
                busy={busy}
                onClose={() => void close(trade)}
                onSetExits={onSetExits}
              />
            ))}
          </ul>
        </div>
      )}
      <Pager
        label={t('app.crypto.trades.pager.open')}
        page={page.page}
        pages={page.pages}
        onPage={page.setPage}
      />
    </section>
  );
}

export function PendingPanel({
  orders,
  busy,
  days,
  onCancel,
}: {
  orders: PendingOrder[];
  busy: boolean;
  days: number;
  onCancel: (id: string) => Promise<boolean>;
}) {
  const { t, locale } = useI18n();
  const money = useMoney();
  // Only the orders that open a position: a take profit or stop loss goes in its open card.
  const entries = orders.filter((o) => o.positionId === null);
  const page = usePage(entries);
  return (
    <section className="card cc-panel" aria-labelledby="cc-pending-title">
      <h2 id="cc-pending-title" className="section-title">
        {t('app.crypto.trades.pendingTitle', { count: entries.length })}
      </h2>
      <p className="cc-hint">{t('app.crypto.trades.pendingHint', { days })}</p>
      <p className="cc-helps">
        <Help term="pending" label={t('app.crypto.help.pending')} />
        <Help term="reserved" label={t('app.crypto.help.reserved')} />
      </p>
      {entries.length === 0 ? (
        <p className="cc-hint">{t('app.crypto.trades.pendingEmpty')}</p>
      ) : (
        <div className="cc-table">
          <ColumnHeads kind="pending" keys={PENDING_COLS} />
          <ul className="cc-trades">
            {page.rows.map((order) => {
              const kind = orderKind(order, t);
              const exits: Partial<Record<ExitKind, number>> = {};
              if (order.takeProfit !== null) exits.takeProfit = order.takeProfit;
              if (order.stopLoss !== null) exits.stopLoss = order.stopLoss;
              return (
                <li
                  key={order.id}
                  className={`cc-trade cc-trade--pending cc-trade--${order.direction}`}
                >
                  <Cell role="who" label={t('app.crypto.trades.cols.position')}>
                    <span className="cc-who">
                      <DirectionBadge direction={order.direction} />
                      <b>{order.symbol}</b>
                      <SlotBadge slot={order.slot} />
                    </span>
                    <small className="cc-sub">{kind}</small>
                  </Cell>
                  <Cell role="prices" label={t('app.crypto.trades.cols.prices')}>
                    <Mini label={t('app.crypto.trades.facts.order')}>
                      <b>{money.price(order.price)}</b>
                    </Mini>
                    <Mini label={t('app.crypto.trades.facts.nowShort')}>
                      {order.currentPrice === null ? '—' : money.price(order.currentPrice)}
                    </Mini>
                  </Cell>
                  <Cell role="amount" label={t('app.crypto.trades.cols.reserved')}>
                    <span>{money.amount(order.reserved)}</span>
                  </Cell>
                  <Cell role="middle" label={t('app.crypto.trades.cols.exits')}>
                    <ExitLines exits={exits} current={undefined} />
                  </Cell>
                  <Cell role="end" label={t('app.crypto.trades.cols.dates')}>
                    <Mini label={t('app.crypto.trades.facts.created')}>
                      {formatDateTime(order.createdAt, locale)}
                    </Mini>
                    <Mini label={t('app.crypto.trades.facts.expires')}>
                      {formatDateTime(order.expiresAt, locale)}
                    </Mini>
                  </Cell>
                  <div className="cc-cell cc-cell--actions">
                    <button
                      type="button"
                      className="cc-tool"
                      disabled={busy}
                      onClick={() => void onCancel(order.id)}
                    >
                      {t('app.crypto.trades.cancel')}
                      <span className="sr-only">
                        {' '}
                        {kind} {withSlot(order.symbol, order.slot)}
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <Pager
        label={t('app.crypto.trades.pager.pending')}
        page={page.page}
        pages={page.pages}
        onPage={page.setPage}
      />
    </section>
  );
}

/**
 * The closed operations. With `transfer` (a practice portfolio), each one with a result can be
 * added once to an account of type Criptomonedas.
 */
export function ClosedPanel({
  trades,
  transfer,
}: {
  trades: ClosedTrade[];
  transfer?: AccountTransfer;
}) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const page = usePage(trades);
  return (
    <section className="card cc-panel" aria-labelledby="cc-closed-title">
      <h2 id="cc-closed-title" className="section-title">
        {t('app.crypto.trades.closedTitle', { count: trades.length })}
      </h2>
      <p className="cc-helps">
        <Help term="realized" label={t('app.crypto.help.realized')} />
      </p>
      {transfer && trades.length > 0 && <p className="cc-hint">{t('app.crypto.transfer.hint')}</p>}
      {trades.length === 0 ? (
        <p className="cc-hint">{t('app.crypto.trades.closedEmpty')}</p>
      ) : (
        <div className="cc-table">
          <ColumnHeads kind="closed" keys={CLOSED_COLS} />
          <ul className="cc-trades">
            {page.rows.map((trade) => (
              <li
                key={trade.id}
                className={`cc-trade cc-trade--closed cc-trade--${trade.direction}`}
              >
                <Cell role="who" label={t('app.crypto.trades.cols.position')}>
                  <span className="cc-who">
                    <DirectionBadge direction={trade.direction} />
                    <b>{trade.symbol}</b>
                    <SlotBadge slot={trade.slot} />
                  </span>
                  <small className="cc-sub">
                    {formatQuantity(trade.quantity, locale)} ·{' '}
                    {formatDateTime(trade.openedAt, locale)}
                  </small>
                </Cell>
                <Cell role="prices" label={t('app.crypto.trades.cols.prices')}>
                  <Mini label={t('app.crypto.trades.facts.entry')}>
                    {money.price(trade.entryPrice)}
                  </Mini>
                  <Mini label={t('app.crypto.trades.facts.exit')}>
                    {money.price(trade.exitPrice)}
                  </Mini>
                </Cell>
                <Cell role="amount" label={t('app.crypto.trades.cols.amount')}>
                  <span>{money.amount(trade.invested)}</span>
                  <small className="cc-sub">
                    {t('app.crypto.trades.breakdown.feesShort', {
                      amount: money.amount(trade.fees),
                    })}
                  </small>
                </Cell>
                <Cell role="middle" label={t('app.crypto.trades.cols.closing')}>
                  <span>{t(`app.crypto.trades.closeTypes.${trade.closeType}`)}</span>
                  <small className="cc-sub">{formatDateTime(trade.closedAt, locale)}</small>
                </Cell>
                <Cell role="end" label={t('app.crypto.trades.cols.result')}>
                  <BigResult pnl={trade.pnl} percent={trade.pnlPercent} />
                </Cell>
                {transfer && <AddToAccount trade={trade} transfer={transfer} />}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Pager
        label={t('app.crypto.trades.pager.closed')}
        page={page.page}
        pages={page.pages}
        onPage={page.setPage}
      />
    </section>
  );
}
