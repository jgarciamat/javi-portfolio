import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { storage } from '@shared/utils/storage';
import { useCryptoMarket } from '../application/useCryptoMarket';
import { useLayers } from '../application/useLayers';
import { useAlerts, useRanking, type Ranking } from '../application/useRanking';
import { useSimulator, type Simulator } from '../application/useSimulator';
import { withSlot } from '../domain/orders';
import { outOfBalance } from '../domain/season';
import { CHART_INTERVALS, DEFAULT_INTERVAL } from '../domain/chart';
import type { CryptoCoin, SimFill, SimPortfolio } from '../domain/types';
import { Loading, MarketPanel, type View } from './MarketPanel';
import {
  MoneyProvider,
  useDisplayCurrency,
  useMoney,
  type DisplayChoice,
  type Money,
} from './money';
import { DataNotice, GlossaryButton, RiskBanner } from './Notices';
import { OrderBox } from './OrderBox';
import { AlertsCard, PlansCard, StatsCard } from './PremiumPanel';
import { RankingCard, RankingIntro } from './RankingCard';
import { BadgesCard, PracticeOffer, SeasonPanel } from './SeasonPanel';
import { useGuide } from './Learn';
import { SimSummary } from './SimSummary';
import { ClosedPanel, OpenPanel, PendingPanel } from './TradePanels';

type Translate = (key: string, vars?: Record<string, string | number>) => string;
import type { ChartLine } from './useCandleChart';
import '../../finances/ui/css/Sections.css';
import './css/Crypto.css';

const VIEW_KEY = 'mm_crypto_view';
const DEFAULT_SYMBOL = 'BTC';

/** The coin and candle size last looked at, on this device (a convenience, nothing more). */
export function savedView(): View {
  try {
    const saved = JSON.parse(storage.get(VIEW_KEY) ?? '{}') as Record<string, unknown>;
    const interval = CHART_INTERVALS.find((i) => i === saved.interval) ?? DEFAULT_INTERVAL;
    const symbol =
      typeof saved.symbol === 'string' && /^[A-Z]{2,6}$/.test(saved.symbol)
        ? saved.symbol
        : DEFAULT_SYMBOL;
    return { symbol, interval };
  } catch {
    return { symbol: DEFAULT_SYMBOL, interval: DEFAULT_INTERVAL };
  }
}

/** One sentence per order filled, expired or position closed since the last look. */
export function fillText(f: SimFill, t: Translate, price: (euros: number) => string): string {
  const vars = { coin: withSlot(f.symbol, f.slot), price: f.price === null ? '' : price(f.price) };
  if (f.type === 'expired') return t('app.crypto.fills.expired', vars);
  if (f.type === 'liquidation') return t('app.crypto.fills.liquidation', vars);
  const opening = (f.side === 'buy') === (f.direction === 'long');
  return opening
    ? t(`app.crypto.fills.opened.${f.direction}`, vars)
    : t(`app.crypto.fills.closed.${f.type}`, vars);
}

function FillsNotice({ fills }: { fills: SimFill[] }) {
  const { t } = useI18n();
  const money = useMoney();
  if (!fills.length) return null;
  return (
    <div className="cc-fills" role="status">
      <p>
        <b>{t('app.crypto.fills.title')}</b>
      </p>
      <ul>
        {fills.map((f) => (
          <li key={f.orderId}>{fillText(f, t, money.price)}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Lines of the person's purchases and pending orders of the coin, in the display currency, each
 * with the number of its operation («Entrada short #1», «TP #1», «Pendiente long #2»).
 */
export function chartLines(
  p: SimPortfolio | null,
  symbol: string,
  t: Translate,
  money: Pick<Money, 'toShown'>
): ChartLine[] {
  if (!p) return [];
  return [
    ...p.open
      .filter((o) => o.symbol === symbol)
      .map((o) => ({
        id: o.id,
        price: money.toShown(o.entryPrice),
        kind: 'entry' as const,
        slot: o.slot,
        title: withSlot(t(`app.crypto.chart.lineEntry.${o.direction}`), o.slot),
      })),
    ...p.pending
      .filter((o) => o.symbol === symbol)
      .map((o) => {
        const exit = o.positionId !== null;
        const kind = exit ? (o.type === 'limit' ? 'takeProfit' : 'stopLoss') : 'order';
        return {
          id: o.id,
          price: money.toShown(o.price),
          kind: kind as ChartLine['kind'],
          slot: o.slot,
          title: withSlot(
            t(
              exit
                ? `app.crypto.chart.lines.${kind}`
                : `app.crypto.chart.lines.order.${o.direction}`
            ),
            o.slot
          ),
        };
      }),
  ];
}

/** Summary first, then (after the chart) the order box and the operations. */
function SimulatorHead({ sim }: { sim: Simulator }) {
  if (!sim.portfolio) {
    return sim.loadError ? (
      <p className="error-banner" role="alert">
        {sim.loadError}
      </p>
    ) : (
      <Loading />
    );
  }
  return (
    <>
      <FillsNotice fills={sim.fills} />
      {sim.action.error && (
        <p className="error-banner" role="alert">
          {sim.action.error}
        </p>
      )}
      <SimSummary portfolio={sim.portfolio} />
    </>
  );
}

function SimulatorBody({
  portfolio,
  sim,
  symbol,
  coin,
  onGlossary,
}: {
  portfolio: SimPortfolio;
  sim: Simulator;
  symbol: string;
  coin: CryptoCoin | undefined;
  onGlossary: () => void;
}) {
  const busy = sim.action.pending;
  return (
    <>
      <OrderBox
        symbol={symbol}
        coinName={coin?.name ?? symbol}
        price={coin?.price ?? null}
        portfolio={portfolio}
        busy={busy}
        onPlace={sim.place}
        onGuide={onGlossary}
        practice={
          outOfBalance(portfolio) ? <PracticeOffer portfolio={portfolio} sim={sim} /> : undefined
        }
      />
      <GlossaryButton onOpen={onGlossary} />
      <OpenPanel
        trades={portfolio.open}
        pending={portfolio.pending}
        bps={portfolio.account.feeBps}
        busy={busy}
        onPlace={sim.place}
        onSetExits={sim.setExits}
      />
      <PendingPanel
        orders={portfolio.pending}
        busy={busy}
        days={portfolio.limits.pendingDays}
        onCancel={sim.cancel}
      />
      <ClosedPanel trades={portfolio.closed} />
      <StatsCard portfolio={portfolio} />
    </>
  );
}

/** The ranking, alerts, badges and «Free and Premium», once the portfolio is known. */
function SeasonExtras({
  portfolio,
  coins,
  ranking,
}: {
  portfolio: SimPortfolio;
  coins: CryptoCoin[];
  ranking: Ranking;
}) {
  const { t } = useI18n();
  const premium = portfolio.plan.premium;
  const alerts = useAlerts(t('app.crypto.alerts.error'), premium);
  return (
    <>
      <RankingCard state={ranking} />
      <AlertsCard premium={premium} alerts={alerts} coins={coins} />
      <BadgesCard portfolio={portfolio} />
      <div id="cc-plans">
        <PlansCard premium={premium} />
      </div>
    </>
  );
}

/** The freshest word on the market data: the chart's, else the coin list's. */
const statusOf = (market: ReturnType<typeof useCryptoMarket>) =>
  market.candles?.market ?? market.coins?.market ?? null;

/**
 * The ECB rate the server converted the USDT prices with (the coin list's covers every coin),
 * taken for the dollars so a coin quoted in USDT shows its USDT price again.
 */
function useServerRate(market: ReturnType<typeof useCryptoMarket>, currency: DisplayChoice) {
  const rate = market.coins?.market.usdPerEur ?? market.candles?.market.usdPerEur ?? null;
  const { adopt } = currency;
  useEffect(() => {
    if (rate !== null) adopt(rate);
  }, [rate, adopt]);
  return rate;
}

/** The coin on screen and the market its prices come from, for the note (null while loading). */
function quotedCoin(market: ReturnType<typeof useCryptoMarket>, symbol: string) {
  const quote =
    market.candles?.quote ?? market.coins?.coins.find((c) => c.symbol === symbol)?.quote;
  return quote ? { symbol, quote } : null;
}

function Console({ currency }: { currency: DisplayChoice }) {
  const { t } = useI18n();
  const money = useMoney();
  const [view, setView] = useState(savedView);
  const guide = useGuide();
  const [layers, toggleLayer] = useLayers();
  const market = useCryptoMarket(view.symbol, view.interval, t('app.crypto.market.error'));
  const sim = useSimulator(t('app.crypto.sim.error'));
  // Asked for once the portfolio of the month is there (the server starts it on the first visit).
  const ranking = useRanking(t('app.crypto.ranking.error'), !!sim.portfolio);
  const coin = market.coins?.coins.find((c) => c.symbol === view.symbol);
  const rate = useServerRate(market, currency);
  const premium = !!sim.portfolio?.plan.premium;
  const lines = useMemo(
    () => chartLines(sim.portfolio, view.symbol, t, money),
    [sim.portfolio, view.symbol, t, money]
  );

  const change = (next: Partial<View>) => {
    const value = { ...view, ...next };
    setView(value);
    storage.set(VIEW_KEY, JSON.stringify(value));
  };

  return (
    <div className="section-view cc">
      <RiskBanner />
      <DataNotice
        market={statusOf(market)}
        unavailable={currency.unavailable}
        coin={quotedCoin(market, view.symbol)}
        usdPerEur={rate}
      />
      <RankingIntro ranking={ranking.ranking} />
      {sim.portfolio && <SeasonPanel portfolio={sim.portfolio} sim={sim} />}
      <SimulatorHead sim={sim} />
      <MarketPanel
        view={view}
        market={market}
        coin={coin}
        lines={lines}
        layers={layers}
        currency={currency.chosen}
        onChange={change}
        onCurrency={currency.choose}
        onToggleLayer={toggleLayer}
        guide={guide}
        premium={premium}
      />
      {sim.portfolio && (
        <>
          <SimulatorBody
            portfolio={sim.portfolio}
            sim={sim}
            symbol={view.symbol}
            coin={coin}
            onGlossary={() => guide.show('glossary')}
          />
          <SeasonExtras
            portfolio={sim.portfolio}
            coins={market.coins?.coins ?? []}
            ranking={ranking}
          />
        </>
      )}
      <GlossaryButton onOpen={() => guide.show('glossary')} />
    </div>
  );
}

/**
 * «Consola crypto»: the chart of the main coins (candles, sizes, layers, zoom) and a simulator with
 * play money to learn how buying and selling works and whether it would have gained or lost. Never
 * real money, no advice, no signals: neutral explanations only. Amounts can be shown in euros or
 * dollars; the simulator always works in euros.
 */
export function CryptoConsoleView() {
  const choice = useDisplayCurrency();
  return (
    <MoneyProvider display={choice.display}>
      <Console currency={choice} />
    </MoneyProvider>
  );
}
