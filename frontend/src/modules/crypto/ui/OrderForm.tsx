import { useId, useState, type FormEvent } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { parseDecimal } from '@shared/utils/numbers';
import { formatEur, formatPrice, formatQuantity, formatRate } from '../domain/format';
import { QUICK_AMOUNTS, buyEstimate, fillsNow } from '../domain/orders';
import type { OrderRequest, TradeType } from '../domain/types';
import { Help } from './Notices';

interface OrderFormProps {
  symbol: string;
  coinName: string;
  /** Last price; null while the market data is not available. */
  price: number | null;
  cash: number;
  feeBps: number;
  busy: boolean;
  onPlace: (order: OrderRequest) => Promise<boolean>;
}

const TYPES: TradeType[] = ['market', 'limit', 'stop'];

function OrderTypes({ type, onChange }: { type: TradeType; onChange: (t: TradeType) => void }) {
  const { t } = useI18n();
  return (
    <fieldset className="cc-types">
      <legend className="field-label">{t('app.crypto.order.type')}</legend>
      {TYPES.map((value) => (
        <label key={value} className={`cc-type${type === value ? ' cc-type--on' : ''}`}>
          <input
            type="radio"
            name="cc-order-type"
            value={value}
            checked={type === value}
            onChange={() => onChange(value)}
          />
          <span>
            <b>{t(`app.crypto.order.types.${value}`)}</b>
            <small>{t(`app.crypto.order.typesHint.${value}`)}</small>
          </span>
        </label>
      ))}
      <Help term={type} label={t(`app.crypto.help.${type}`)} />
    </fieldset>
  );
}

function Estimate({
  symbol,
  price,
  cash,
  feeBps,
  estimate,
}: {
  symbol: string;
  price: number | null;
  cash: number;
  feeBps: number;
  estimate: ReturnType<typeof buyEstimate> | null;
}) {
  const { t, locale } = useI18n();
  const rows: [string, string][] = [
    [t('app.crypto.order.now'), price === null ? '—' : formatPrice(price, locale)],
    [
      t('app.crypto.order.coins', { symbol }),
      estimate ? formatQuantity(estimate.quantity, locale) : '—',
    ],
    [
      t('app.crypto.order.fee', { rate: formatRate(feeBps, locale) }),
      estimate ? formatEur(estimate.fee, locale) : '—',
    ],
    [t('app.crypto.order.total'), estimate ? formatEur(estimate.total, locale) : '—'],
    [t('app.crypto.order.cash'), formatEur(cash, locale)],
  ];
  return (
    <>
      <dl className="cc-estimate" aria-live="polite">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="cc-helps">
        <Help term="fee" label={t('app.crypto.help.fee')} />
      </p>
    </>
  );
}

/**
 * Buying with play money: how much to invest, and whether now (market), only if the price comes
 * down to a level (limit) or once it goes up to one (stop). The estimate shows the coins, the
 * commission and the total before anything is done.
 */
export function OrderForm({
  symbol,
  coinName,
  price,
  cash,
  feeBps,
  busy,
  onPlace,
}: OrderFormProps) {
  const { t, locale } = useI18n();
  const [type, setType] = useState<TradeType>('market');
  const [amount, setAmount] = useState('');
  const [limit, setLimit] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const amountId = useId();
  const priceId = useId();

  const euros = parseDecimal(amount);
  const target = parseDecimal(limit);
  const pending = type !== 'market';
  const at = pending ? (target > 0 ? target : null) : price;
  const estimate = euros >= 1 && at ? buyEstimate(euros, at, feeBps) : null;

  const check = (): string | null => {
    if (price === null) return t('app.crypto.order.noPrice');
    if (!(euros >= 1)) return t('app.crypto.order.minAmount');
    if (pending && !(target > 0)) return t('app.crypto.order.needPrice');
    if (pending && fillsNow('buy', type, target, price)) {
      return t(`app.crypto.order.fillsNow.${type}`);
    }
    return estimate!.total > cash ? t('app.crypto.order.noCash') : null;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setDone(null);
    const issue = check();
    setProblem(issue);
    if (issue) return;
    const order: OrderRequest = { action: 'buy', symbol, type, amount: euros };
    if (!(await onPlace(pending ? { ...order, price: target } : order))) return;
    setDone(t(pending ? 'app.crypto.order.saved' : 'app.crypto.order.bought', { coin: coinName }));
    setAmount('');
    setLimit('');
  };

  return (
    <section className="card cc-order" aria-labelledby="cc-order-title">
      <h2 id="cc-order-title" className="section-title">
        {t('app.crypto.order.title', { coin: coinName })}
      </h2>
      <p className="cc-reminder">{t('app.crypto.order.reminder')}</p>
      <form onSubmit={(e) => void submit(e)} noValidate>
        <OrderTypes
          type={type}
          onChange={(value) => {
            setType(value);
            setProblem(null);
          }}
        />
        <div className="field">
          <label className="field-label" htmlFor={amountId}>
            {t('app.crypto.order.amount')}
          </label>
          <input
            id={amountId}
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="cc-quick" role="group" aria-label={t('app.crypto.order.quick')}>
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                className="btn-secondary btn-small"
                onClick={() => setAmount(String(value))}
              >
                {formatEur(value, locale)}
              </button>
            ))}
          </div>
        </div>
        {pending && (
          <div className="field">
            <label className="field-label" htmlFor={priceId}>
              {t(`app.crypto.order.priceLabel.${type}`)}
            </label>
            <input
              id={priceId}
              inputMode="decimal"
              autoComplete="off"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>
        )}
        <Estimate symbol={symbol} price={price} cash={cash} feeBps={feeBps} estimate={estimate} />
        {problem && (
          <p className="form-error" role="alert">
            {problem}
          </p>
        )}
        <button type="submit" className="btn-primary btn-block" disabled={busy}>
          {t(pending ? 'app.crypto.order.savePending' : 'app.crypto.order.buyNow')}
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
