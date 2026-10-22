import { useId, useState, type FormEvent } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { parseDecimal } from '@shared/utils/numbers';
import { formatChange, formatDateTime, formatQuantity, pnl } from '../domain/format';
import { fillsNow } from '../domain/orders';
import type {
  ClosedTrade,
  Direction,
  OpenTrade,
  OrderRequest,
  PendingOrder,
  PendingType,
} from '../domain/types';
import { useMoney } from './money';
import { Help } from './Notices';

type Place = (order: OrderRequest) => Promise<boolean>;
type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** Closed operations shown at first; «Show more» adds this many. */
export const CLOSED_PAGE = 10;

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

/** What an order does, in words: «Open a long (limit)», «Take profit», «Stop loss». */
export function orderKind(
  o: Pick<PendingOrder, 'positionId' | 'direction' | 'type'>,
  t: Translate
) {
  return o.positionId === null
    ? t(`app.crypto.trades.kind.open.${o.direction}.${o.type}`)
    : t(`app.crypto.trades.kind.close.${o.type}`);
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

/**
 * Closing a position later: at its take profit (limit) or at its stop loss (stop). A long is
 * closed above its entry to gain and below to limit a loss; a short the other way round.
 */
function ScheduleClose({
  trade,
  busy,
  onPlace,
  onDone,
}: {
  trade: OpenTrade;
  busy: boolean;
  onPlace: Place;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const [type, setType] = useState<PendingType>('limit');
  const [value, setValue] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const id = useId();
  const price = parseDecimal(value);
  const side = trade.direction === 'long' ? 'sell' : 'buy';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    let issue: string | null = null;
    if (!(price > 0)) issue = t('app.crypto.order.check.needPrice.long');
    else if (
      trade.currentPrice !== null &&
      fillsNow(side, type, price, money.toShown(trade.currentPrice))
    ) {
      issue = t('app.crypto.close.fillsNow');
    }
    setProblem(issue);
    if (issue) return;
    const order = {
      action: 'sell' as const,
      positionId: trade.id,
      type,
      price: money.toBasePrice(price),
    };
    if (await onPlace(order)) onDone();
  };

  return (
    <form className="cc-schedule" onSubmit={(e) => void submit(e)} noValidate>
      <fieldset className="cc-types">
        <legend className="cc-label">{t('app.crypto.close.when')}</legend>
        {(['limit', 'stop'] as const).map((option) => (
          <label key={option} className={`cc-type${type === option ? ' cc-type--on' : ''}`}>
            <input
              type="radio"
              name={`cc-close-${trade.id}`}
              checked={type === option}
              onChange={() => setType(option)}
            />
            <span>{t(`app.crypto.close.types.${trade.direction}.${option}`)}</span>
          </label>
        ))}
      </fieldset>
      <div className="cc-field">
        <label className="cc-label" htmlFor={id}>
          {t('app.crypto.sell.price', { symbol: money.symbol })}
        </label>
        <div className="cc-unit-input">
          <input
            id={id}
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <span aria-hidden="true">{money.symbol}</span>
        </div>
      </div>
      {problem && (
        <p className="form-error" role="alert">
          {problem}
        </p>
      )}
      <button type="submit" className="cc-tool cc-tool--strong" disabled={busy}>
        {t('app.crypto.close.save')}
      </button>
    </form>
  );
}

function OpenCard({
  trade,
  orders,
  busy,
  onPlace,
}: {
  trade: OpenTrade;
  orders: PendingOrder[];
  busy: boolean;
  onPlace: Place;
}) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const [scheduling, setScheduling] = useState(false);
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
      {orders.length > 0 && (
        <p className="cc-scheduled">
          {t('app.crypto.trades.scheduled')}{' '}
          {orders.map((o) => `${orderKind(o, t)} ${money.price(o.price)}`).join(' · ')}
        </p>
      )}
      <div className="button-row">
        <button
          type="button"
          className="cc-tool cc-tool--strong"
          disabled={busy || trade.currentPrice === null}
          onClick={() => void onPlace({ action: 'sell', positionId: trade.id, type: 'market' })}
        >
          {t('app.crypto.trades.closeNow')}
        </button>
        <button
          type="button"
          className="cc-tool"
          aria-expanded={scheduling}
          onClick={() => setScheduling((v) => !v)}
        >
          {t('app.crypto.trades.schedule')}
        </button>
      </div>
      {scheduling && (
        <ScheduleClose
          trade={trade}
          busy={busy}
          onPlace={onPlace}
          onDone={() => setScheduling(false)}
        />
      )}
    </li>
  );
}

export function OpenPanel({
  trades,
  pending,
  busy,
  onPlace,
}: {
  trades: OpenTrade[];
  pending: PendingOrder[];
  busy: boolean;
  onPlace: Place;
}) {
  const { t } = useI18n();
  return (
    <section className="card cc-panel" aria-labelledby="cc-open-title">
      <h2 id="cc-open-title" className="section-title">
        {t('app.crypto.trades.openTitle', { count: trades.length })}
      </h2>
      <p className="cc-helps">
        <Help term="unrealized" label={t('app.crypto.help.unrealized')} />
      </p>
      {trades.length === 0 ? (
        <p className="cc-hint">{t('app.crypto.trades.openEmpty')}</p>
      ) : (
        <ul className="cc-trades">
          {trades.map((trade) => (
            <OpenCard
              key={trade.id}
              trade={trade}
              orders={pending.filter((o) => o.positionId === trade.id)}
              busy={busy}
              onPlace={onPlace}
            />
          ))}
        </ul>
      )}
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
  return (
    <section className="card cc-panel" aria-labelledby="cc-pending-title">
      <h2 id="cc-pending-title" className="section-title">
        {t('app.crypto.trades.pendingTitle', { count: orders.length })}
      </h2>
      <p className="cc-hint">{t('app.crypto.trades.pendingHint', { days })}</p>
      <p className="cc-helps">
        <Help term="pending" label={t('app.crypto.help.pending')} />
        <Help term="reserved" label={t('app.crypto.help.reserved')} />
      </p>
      {orders.length === 0 ? (
        <p className="cc-hint">{t('app.crypto.trades.pendingEmpty')}</p>
      ) : (
        <ul className="cc-trades">
          {orders.map((order) => {
            const facts: [string, string][] = [];
            if (order.amount !== null) facts.push(['reserved', money.amount(order.reserved)]);
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
    </section>
  );
}

export function ClosedPanel({ trades }: { trades: ClosedTrade[] }) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const [shown, setShown] = useState(CLOSED_PAGE);
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
        <>
          <ul className="cc-trades">
            {trades.slice(0, shown).map((trade) => (
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
          {shown < trades.length && (
            <button
              type="button"
              className="cc-tool"
              onClick={() => setShown((n) => n + CLOSED_PAGE)}
            >
              {t('app.crypto.trades.more')}
            </button>
          )}
        </>
      )}
    </section>
  );
}
