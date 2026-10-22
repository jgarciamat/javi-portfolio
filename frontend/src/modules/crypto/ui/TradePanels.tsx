import { useId, useState, type FormEvent } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { parseDecimal } from '@shared/utils/numbers';
import {
  formatChange,
  formatDateTime,
  formatEur,
  formatPrice,
  formatQuantity,
  tone,
} from '../domain/format';
import { fillsNow } from '../domain/orders';
import type {
  ClosedTrade,
  OpenTrade,
  OrderRequest,
  PendingOrder,
  PendingType,
} from '../domain/types';
import { Help } from './Notices';

type Place = (order: OrderRequest) => Promise<boolean>;

/** Closed operations shown at first; «Show more» adds this many. */
export const CLOSED_PAGE = 10;

function Result({ pnl, percent }: { pnl: number | null; percent: number | null }) {
  const { locale } = useI18n();
  if (pnl === null || percent === null) return <b>—</b>;
  return (
    <b className={`cc-${tone(pnl)}`}>
      {formatEur(pnl, locale, true)} ({formatChange(percent, locale)})
    </b>
  );
}

/** A sale that waits for a price: «sell if it goes up to» (limit) or «if it goes down to» (stop). */
function ScheduleSale({
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
  const [type, setType] = useState<PendingType>('limit');
  const [value, setValue] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const id = useId();
  const price = parseDecimal(value);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    let issue: string | null = null;
    if (!(price > 0)) issue = t('app.crypto.order.needPrice');
    else if (trade.currentPrice !== null && fillsNow('sell', type, price, trade.currentPrice)) {
      issue = t(`app.crypto.sell.fillsNow.${type}`);
    }
    setProblem(issue);
    if (issue) return;
    if (await onPlace({ action: 'sell', positionId: trade.id, type, price })) onDone();
  };

  return (
    <form className="cc-schedule" onSubmit={(e) => void submit(e)} noValidate>
      <fieldset className="cc-types cc-types--inline">
        <legend className="field-label">{t('app.crypto.sell.when')}</legend>
        {(['limit', 'stop'] as const).map((option) => (
          <label key={option} className={`cc-type${type === option ? ' cc-type--on' : ''}`}>
            <input
              type="radio"
              name={`cc-sell-${trade.id}`}
              checked={type === option}
              onChange={() => setType(option)}
            />
            <span>
              <b>{t(`app.crypto.sell.types.${option}`)}</b>
            </span>
          </label>
        ))}
        <Help term={type} label={t(`app.crypto.help.${type}`)} />
      </fieldset>
      <div className="field">
        <label className="field-label" htmlFor={id}>
          {t('app.crypto.sell.price')}
        </label>
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      {problem && (
        <p className="form-error" role="alert">
          {problem}
        </p>
      )}
      <button type="submit" className="btn-secondary" disabled={busy}>
        {t('app.crypto.sell.save')}
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
  const [scheduling, setScheduling] = useState(false);
  return (
    <li className="cc-trade">
      <div className="cc-trade-head">
        <b>{trade.symbol}</b>
        <span>{formatQuantity(trade.quantity, locale)}</span>
        <Result pnl={trade.pnl} percent={trade.pnlPercent} />
      </div>
      <dl className="cc-facts">
        <div>
          <dt>{t('app.crypto.trades.bought')}</dt>
          <dd>
            {formatPrice(trade.entryPrice, locale)} · {formatDateTime(trade.openedAt, locale)}
          </dd>
        </div>
        <div>
          <dt>{t('app.crypto.trades.invested')}</dt>
          <dd>
            {formatEur(trade.invested, locale)} + {formatEur(trade.entryFee, locale)}{' '}
            {t('app.crypto.trades.feeWord')}
          </dd>
        </div>
        <div>
          <dt>{t('app.crypto.trades.now')}</dt>
          <dd>{trade.currentPrice === null ? '—' : formatPrice(trade.currentPrice, locale)}</dd>
        </div>
        <div>
          <dt>{t('app.crypto.trades.ifSold')}</dt>
          <dd>{trade.value === null ? '—' : formatEur(trade.value, locale)}</dd>
        </div>
      </dl>
      {orders.length > 0 && (
        <p className="cc-scheduled">
          {t('app.crypto.trades.scheduled')}{' '}
          {orders
            .map(
              (o) => `${t(`app.crypto.trades.kind.sell.${o.type}`)} ${formatPrice(o.price, locale)}`
            )
            .join(' · ')}
        </p>
      )}
      <div className="button-row">
        <button
          type="button"
          className="btn-primary"
          disabled={busy || trade.currentPrice === null}
          onClick={() => void onPlace({ action: 'sell', positionId: trade.id, type: 'market' })}
        >
          {t('app.crypto.trades.sellNow')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          aria-expanded={scheduling}
          onClick={() => setScheduling((v) => !v)}
        >
          {t('app.crypto.trades.schedule')}
        </button>
      </div>
      {scheduling && (
        <ScheduleSale
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
        <p className="section-hint">{t('app.crypto.trades.openEmpty')}</p>
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
  return (
    <section className="card cc-panel" aria-labelledby="cc-pending-title">
      <h2 id="cc-pending-title" className="section-title">
        {t('app.crypto.trades.pendingTitle', { count: orders.length })}
      </h2>
      <p className="section-hint">{t('app.crypto.trades.pendingHint', { days })}</p>
      <p className="cc-helps">
        <Help term="pending" label={t('app.crypto.help.pending')} />
        <Help term="reserved" label={t('app.crypto.help.reserved')} />
      </p>
      {orders.length === 0 ? (
        <p className="section-hint">{t('app.crypto.trades.pendingEmpty')}</p>
      ) : (
        <ul className="cc-trades">
          {orders.map((order) => (
            <li key={order.id} className="cc-trade">
              <div className="cc-trade-head">
                <b>{order.symbol}</b>
                <span>{t(`app.crypto.trades.kind.${order.side}.${order.type}`)}</span>
                <b>{formatPrice(order.price, locale)}</b>
              </div>
              <dl className="cc-facts">
                {order.amount !== null && (
                  <div>
                    <dt>{t('app.crypto.trades.reserved')}</dt>
                    <dd>{formatEur(order.reserved, locale)}</dd>
                  </div>
                )}
                <div>
                  <dt>{t('app.crypto.trades.now')}</dt>
                  <dd>
                    {order.currentPrice === null ? '—' : formatPrice(order.currentPrice, locale)}
                  </dd>
                </div>
                <div>
                  <dt>{t('app.crypto.trades.created')}</dt>
                  <dd>{formatDateTime(order.createdAt, locale)}</dd>
                </div>
                <div>
                  <dt>{t('app.crypto.trades.expires')}</dt>
                  <dd>{formatDateTime(order.expiresAt, locale)}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => void onCancel(order.id)}
              >
                {t('app.crypto.trades.cancel')}
                <span className="sr-only">
                  {' '}
                  {t(`app.crypto.trades.kind.${order.side}.${order.type}`)} {order.symbol}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ClosedPanel({ trades }: { trades: ClosedTrade[] }) {
  const { t, locale } = useI18n();
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
        <p className="section-hint">{t('app.crypto.trades.closedEmpty')}</p>
      ) : (
        <>
          <ul className="cc-trades">
            {trades.slice(0, shown).map((trade) => (
              <li key={trade.id} className="cc-trade">
                <div className="cc-trade-head">
                  <b>{trade.symbol}</b>
                  <span>{formatQuantity(trade.quantity, locale)}</span>
                  <Result pnl={trade.pnl} percent={trade.pnlPercent} />
                </div>
                <dl className="cc-facts">
                  <div>
                    <dt>{t('app.crypto.trades.bought')}</dt>
                    <dd>
                      {formatPrice(trade.entryPrice, locale)} ·{' '}
                      {formatDateTime(trade.openedAt, locale)}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('app.crypto.trades.sold')}</dt>
                    <dd>
                      {formatPrice(trade.exitPrice, locale)} ·{' '}
                      {formatDateTime(trade.closedAt, locale)} ·{' '}
                      {t(`app.crypto.order.types.${trade.closeType}`)}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('app.crypto.trades.invested')}</dt>
                    <dd>{formatEur(trade.invested, locale)}</dd>
                  </div>
                  <div>
                    <dt>{t('app.crypto.trades.fees')}</dt>
                    <dd>{formatEur(trade.fees, locale)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          {shown < trades.length && (
            <button
              type="button"
              className="btn-secondary"
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
