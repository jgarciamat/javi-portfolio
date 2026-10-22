import { useEffect, useId, useState, type FormEvent } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { parseDecimal } from '@shared/utils/numbers';
import { formatChange, formatDateTime, formatQuantity, pnl } from '../domain/format';
import { exitProblem, exitResult, type ExitKind } from '../domain/orders';
import type {
  ClosedTrade,
  Direction,
  ExitsRequest,
  OpenTrade,
  OrderRequest,
  PendingOrder,
} from '../domain/types';
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

function Result({ pnl: value, percent }: { pnl: number | null; percent: number | null }) {
  const { locale } = useI18n();
  const money = useMoney();
  if (value === null || percent === null) return <b className={pnl(null)}>—</b>;
  return (
    <b className={pnl(value)}>
      {money.amount(value, true)} ({formatChange(percent, locale)})
    </b>
  );
}

const EXITS: { kind: ExitKind; type: PendingOrder['type'] }[] = [
  { kind: 'takeProfit', type: 'limit' },
  { kind: 'stopLoss', type: 'stop' },
];

/** The price of a take profit or stop loss as it goes in its box (display currency). */
const inputValue = (shown: number) => String(Number(shown.toPrecision(10)));

/**
 * The take profit (green) and the stop loss (red) of an open position: its price, how far it is
 * from the current price and what closing there would give. «—» when there is none.
 */
function ExitFacts({
  trade,
  exits,
  bps,
}: {
  trade: OpenTrade;
  exits: Partial<Record<ExitKind, number>>;
  bps: number;
}) {
  const { t, locale } = useI18n();
  const money = useMoney();
  return (
    <dl className="cc-exits">
      {EXITS.map(({ kind }) => {
        const price = exits[kind];
        const result = price === undefined ? null : exitResult(trade, price, bps);
        return (
          <div key={kind} className={`cc-exit cc-exit--${kind}`}>
            <dt>{t(`app.crypto.trades.facts.${kind}`)}</dt>
            {result === null ? (
              <dd>—</dd>
            ) : (
              <dd>
                <b className="cc-exit-price">{money.price(price!)}</b>
                <span>
                  {trade.currentPrice === null
                    ? '—'
                    : t('app.crypto.trades.exits.distance', {
                        percent: formatChange(
                          ((price! - trade.currentPrice) / trade.currentPrice) * 100,
                          locale
                        ),
                      })}
                </span>
                <span>
                  {t('app.crypto.trades.exits.ifReached')}{' '}
                  <Result pnl={result.pnl} percent={result.percent} />
                </span>
              </dd>
            )}
          </div>
        );
      })}
    </dl>
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
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [armed]);
  const which = t('app.crypto.trades.close.which', {
    coin: trade.symbol,
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
        {t(armed ? 'app.crypto.trades.close.confirm' : 'app.crypto.trades.close.label')}
        <span className="sr-only"> {which}</span>
      </button>
      <span className="sr-only" aria-live="polite">
        {armed ? t('app.crypto.trades.close.armed', { seconds: CONFIRM_MS / 1000 }) : ''}
      </span>
    </>
  );
}

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
  const [editing, setEditing] = useState(false);
  const exits: Partial<Record<ExitKind, number>> = {};
  for (const { kind, type } of EXITS) {
    const order = orders.find((o) => o.type === type);
    if (order) exits[kind] = order.price;
  }
  const facts: [string, string][] = [
    ['entry', `${money.price(trade.entryPrice)} · ${formatDateTime(trade.openedAt, locale)}`],
    [
      'invested',
      `${money.amount(trade.invested)} + ${money.amount(trade.entryFee)} ${t('app.crypto.trades.feeWord')}`,
    ],
    ['now', trade.currentPrice === null ? '—' : money.price(trade.currentPrice)],
    ['ifClosed', trade.value === null ? '—' : money.amount(trade.value)],
  ];
  if (trade.liquidationPrice !== null) {
    facts.push(['liquidation', money.price(trade.liquidationPrice)]);
  }
  return (
    <li className={`cc-trade cc-trade--${trade.direction}`}>
      <div className="cc-trade-head">
        <DirectionBadge direction={trade.direction} />
        <b>{trade.symbol}</b>
        <span>{formatQuantity(trade.quantity, locale)}</span>
        <Result pnl={trade.pnl} percent={trade.pnlPercent} />
      </div>
      <dl className="cc-facts">
        {facts.map(([key, text]) => (
          <div key={key}>
            <dt>{t(`app.crypto.trades.facts.${key}`)}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
      <ExitFacts trade={trade} exits={exits} bps={bps} />
      <div className="button-row">
        <CloseTrade trade={trade} busy={busy} onClose={onClose} />
        <button
          type="button"
          className="cc-tool"
          aria-expanded={editing}
          onClick={() => setEditing((v) => !v)}
        >
          {t('app.crypto.trades.exits.edit')}
          <span className="sr-only">
            {' '}
            {t('app.crypto.trades.close.which', {
              coin: trade.symbol,
              direction: t(`app.crypto.order.directionShort.${trade.direction}`),
            })}
          </span>
        </button>
      </div>
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
      setDone(t('app.crypto.trades.close.done', { coin: trade.symbol }));
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
        <ul className="cc-trades">
          {page.rows.map((order) => {
            const facts: [string, string][] = [['reserved', money.amount(order.reserved)]];
            facts.push([
              'now',
              order.currentPrice === null ? '—' : money.price(order.currentPrice),
            ]);
            if (order.takeProfit !== null)
              facts.push(['takeProfit', money.price(order.takeProfit)]);
            if (order.stopLoss !== null) facts.push(['stopLoss', money.price(order.stopLoss)]);
            facts.push(['created', formatDateTime(order.createdAt, locale)]);
            facts.push(['expires', formatDateTime(order.expiresAt, locale)]);
            const kind = orderKind(order, t);
            return (
              <li key={order.id} className={`cc-trade cc-trade--${order.direction}`}>
                <div className="cc-trade-head">
                  <DirectionBadge direction={order.direction} />
                  <b>{order.symbol}</b>
                  <span>{kind}</span>
                  <b>{money.price(order.price)}</b>
                </div>
                <dl className="cc-facts">
                  {facts.map(([key, text]) => (
                    <div key={key}>
                      <dt>{t(`app.crypto.trades.facts.${key}`)}</dt>
                      <dd>{text}</dd>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  className="cc-tool"
                  disabled={busy}
                  onClick={() => void onCancel(order.id)}
                >
                  {t('app.crypto.trades.cancel')}
                  <span className="sr-only">
                    {' '}
                    {kind} {order.symbol}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
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

export function ClosedPanel({ trades }: { trades: ClosedTrade[] }) {
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
      {trades.length === 0 ? (
        <p className="cc-hint">{t('app.crypto.trades.closedEmpty')}</p>
      ) : (
        <ul className="cc-trades">
          {page.rows.map((trade) => (
            <li key={trade.id} className={`cc-trade cc-trade--${trade.direction}`}>
              <div className="cc-trade-head">
                <DirectionBadge direction={trade.direction} />
                <b>{trade.symbol}</b>
                <span>{formatQuantity(trade.quantity, locale)}</span>
                <Result pnl={trade.pnl} percent={trade.pnlPercent} />
              </div>
              <dl className="cc-facts">
                <div>
                  <dt>{t('app.crypto.trades.facts.entry')}</dt>
                  <dd>
                    {money.price(trade.entryPrice)} · {formatDateTime(trade.openedAt, locale)}
                  </dd>
                </div>
                <div>
                  <dt>{t('app.crypto.trades.facts.exit')}</dt>
                  <dd>
                    {money.price(trade.exitPrice)} · {formatDateTime(trade.closedAt, locale)} ·{' '}
                    {t(`app.crypto.trades.closeTypes.${trade.closeType}`)}
                  </dd>
                </div>
                <div>
                  <dt>{t('app.crypto.trades.facts.invested')}</dt>
                  <dd>{money.amount(trade.invested)}</dd>
                </div>
                <div>
                  <dt>{t('app.crypto.trades.fees')}</dt>
                  <dd>{money.amount(trade.fees)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
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
