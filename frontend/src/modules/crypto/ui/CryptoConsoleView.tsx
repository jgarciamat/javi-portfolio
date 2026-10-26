import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import type { ReferralSummary } from '@modules/billing/domain/types';
import { useResource } from '@shared/hooks/useResource';
import { storage } from '@shared/utils/storage';
import { useCryptoMarket } from '../application/useCryptoMarket';
import { useLayers } from '../application/useLayers';
import { useAlerts, useRanking, type Ranking } from '../application/useRanking';
import { useSimulator, type Simulator } from '../application/useSimulator';
import { withSlot } from '../domain/orders';
import { outOfBalance } from '../domain/season';
import { CHART_INTERVALS, DEFAULT_INTERVAL } from '../domain/chart';
import type { CryptoCoin, SimFill, SimPortfolio } from '../domain/types';
import { ConsoleSkeleton } from './ConsoleSkeleton';
import { MarketPanel, loadChart, type View } from './MarketPanel';
import {
  MoneyProvider,
  useDisplayCurrency,
  useMoney,
  type DisplayChoice,
  type Money,
} from './money';
import { InviteCard, InviteNudge } from './InvitePanel';
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
function SimulatorHead({ portfolio, sim }: { portfolio: SimPortfolio; sim: Simulator }) {
  return (
    <>
      <FillsNotice fills={sim.fills} />
      {sim.action.error && (
        <p className="error-banner" role="alert">
          {sim.action.error}
        </p>
      )}
      <SimSummary portfolio={portfolio} />
    </>
  );
}

function SimulatorBody({
  portfolio,
  sim,
  symbol,
  coin,
  onGlossary,
  chart,
}: {
  portfolio: SimPortfolio;
  sim: Simulator;
  symbol: string;
  coin: CryptoCoin | undefined;
  onGlossary: () => void;
  /** The chart of the market: on a computer the order box goes next to it, both in view. */
  chart: ReactNode;
}) {
  const busy = sim.action.pending;
  return (
    <>
      <div className="cc-desk">
        <div className="cc-desk-chart">{chart}</div>
        <div className="cc-desk-side">
          <OrderBox
            symbol={symbol}
            coinName={coin?.name ?? symbol}
            price={coin?.price ?? null}
            portfolio={portfolio}
            busy={busy}
            onPlace={sim.place}
            onGuide={onGlossary}
            practice={
              outOfBalance(portfolio) ? (
                <PracticeOffer portfolio={portfolio} sim={sim} />
              ) : undefined
            }
          />
          <GlossaryButton onOpen={onGlossary} />
        </div>
      </div>
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
  referral,
}: {
  portfolio: SimPortfolio;
  coins: CryptoCoin[];
  ranking: Ranking;
  referral: ReferralSummary | undefined;
}) {
  const { t } = useI18n();
  const premium = portfolio.plan.premium;
  const alerts = useAlerts(t('app.crypto.alerts.error'), premium);
  return (
    <>
      <RankingCard state={ranking} />
      <InviteCard referral={referral} />
      <AlertsCard premium={premium} alerts={alerts} coins={coins} />
      <BadgesCard portfolio={portfolio} />
      <div id="cc-plans">
        <PlansCard premium={premium} />
      </div>
    </>
  );
}

/**
 * The freshest word on the market data: the chart's, else the coin list's, else the last one
 * (while the candles of another coin load without a coin list).
 */
function useMarketStatus(market: ReturnType<typeof useCryptoMarket>) {
  const now = market.candles?.market ?? market.coins?.market ?? null;
  const [last, setLast] = useState(now);
  if (now && now !== last) setLast(now);
  return now ?? last;
}

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

/** Longest wait for the whole console before saying what is missing (the requests go on). */
export const FIRST_PAINT_MS = 20_000;

/** The market part of the first paint: the coins (or their failure), the candles, the chart's code. */
function useMarketReady(market: ReturnType<typeof useCryptoMarket>): boolean {
  const [chart, setChart] = useState(false);
  useEffect(() => {
    void loadChart().then(() => setChart(true));
  }, []);
  return !!market.candles && market.coinsDone && chart;
}

/** All of the first paint: the market, the portfolio, the ranking and the invitations. */
const allThere = (marketReady: boolean, sim: Simulator, ranking: Ranking, invites: boolean) =>
  marketReady &&
  !!sim.portfolio &&
  !sim.switching &&
  invites &&
  !!(ranking.ranking || ranking.error);

/**
 * The console shows whole or not at all: the skeleton stands in for it until everything of the
 * first paint is there, and once shown it stays (another coin or size only veils the chart).
 * Another portfolio waits again. `late` turns true after FIRST_PAINT_MS without everything.
 */
function useFirstPaint(ready: boolean, switching: boolean) {
  const [shown, setShown] = useState(false);
  const [late, setLate] = useState(false);
  if (shown ? switching : ready) {
    setShown(!shown);
    setLate(false);
  }
  useEffect(() => {
    if (shown) return;
    const timer = window.setTimeout(() => setLate(true), FIRST_PAINT_MS);
    return () => window.clearTimeout(timer);
  }, [shown]);
  // Back from another portfolio, the focus returns to its tab (the skeleton took the clicked one).
  const before = useRef(false);
  useEffect(() => {
    if (shown && before.current)
      document.querySelector<HTMLElement>('.cc-portfolio.is-on')?.focus();
    if (shown) before.current = true;
  }, [shown]);
  return { shown, late };
}

/** Why the console cannot be shown yet: the first answers that failed, or a wait too long. */
function failures(
  market: ReturnType<typeof useCryptoMarket>,
  sim: Simulator,
  marketReady: boolean,
  late: boolean,
  t: Translate
): string[] {
  const marketError = market.candles ? null : market.error;
  const simError = sim.portfolio ? null : sim.loadError;
  return [
    marketError ?? (late && !marketReady ? t('app.crypto.market.error') : null),
    simError ?? (late && marketReady ? t('app.crypto.sim.error') : null),
  ].filter((message): message is string => !!message);
}

/** The skeleton while loading or, when something failed, what and «Retry» (all is asked again). */
function Waiting({ errors, onRetry }: { errors: string[]; onRetry: () => void }) {
  const { t } = useI18n();
  if (!errors.length) return <ConsoleSkeleton />;
  return (
    <p className="error-banner" role="alert">
      {errors.join(' ')}{' '}
      <button type="button" className="btn-link" onClick={onRetry}>
        {t('app.crypto.market.retry')}
      </button>
    </p>
  );
}

function Console({ currency, onRetry }: { currency: DisplayChoice; onRetry: () => void }) {
  const { t } = useI18n();
  const money = useMoney();
  const [view, setView] = useState(savedView);
  const guide = useGuide();
  const [layers, toggleLayer] = useLayers();
  const market = useCryptoMarket(view.symbol, view.interval, t('app.crypto.market.error'));
  const sim = useSimulator(t('app.crypto.sim.error'));
  // Asked for once the portfolio of the month is there (the server starts it on the first visit).
  const ranking = useRanking(t('app.crypto.ranking.error'), !!sim.portfolio);
  // «Invite a friend» of the menu, the same programme: without an answer nothing is offered.
  const { billingApi } = useApi();
  const referral = useResource(() => billingApi.referral(), [billingApi]);
  const coin = market.coins?.coins.find((c) => c.symbol === view.symbol);
  const rate = useServerRate(market, currency);
  const status = useMarketStatus(market);
  const premium = !!sim.portfolio?.plan.premium;
  const lines = useMemo(
    () => chartLines(sim.portfolio, view.symbol, t, money),
    [sim.portfolio, view.symbol, t, money]
  );
  const marketReady = useMarketReady(market);
  const ready = allThere(marketReady, sim, ranking, !referral.loading);
  const { shown, late } = useFirstPaint(ready, sim.switching);

  const change = (next: Partial<View>) => {
    const value = { ...view, ...next };
    setView(value);
    storage.set(VIEW_KEY, JSON.stringify(value));
  };

  if (!shown || !sim.portfolio) {
    return (
      <div className="section-view cc">
        <RiskBanner />
        <Waiting errors={failures(market, sim, marketReady, late, t)} onRetry={onRetry} />
      </div>
    );
  }
  return (
    <div className="section-view cc">
      <RiskBanner />
      <DataNotice
        // Never null here: the candles came with it before the console was shown.
        market={status!}
        unavailable={currency.unavailable}
        coin={quotedCoin(market, view.symbol)}
        usdPerEur={rate}
      />
      <RankingIntro ranking={ranking.ranking} />
      <SeasonPanel portfolio={sim.portfolio} sim={sim} />
      <InviteNudge portfolio={sim.portfolio} ranking={ranking.ranking} referral={referral.data} />
      <SimulatorHead portfolio={sim.portfolio} sim={sim} />
      <SimulatorBody
        portfolio={sim.portfolio}
        sim={sim}
        symbol={view.symbol}
        coin={coin}
        onGlossary={() => guide.show('glossary')}
        chart={
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
        }
      />
      <SeasonExtras
        portfolio={sim.portfolio}
        coins={market.coins?.coins ?? []}
        ranking={ranking}
        referral={referral.data}
      />
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
  // «Retry» starts the console again: every request and the wait of the first paint.
  const [attempt, setAttempt] = useState(0);
  return (
    <MoneyProvider display={choice.display}>
      <Console key={attempt} currency={choice} onRetry={() => setAttempt((n) => n + 1)} />
    </MoneyProvider>
  );
}
