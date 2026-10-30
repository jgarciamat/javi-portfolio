import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { track } from '@core/analytics';
import {
  EMPTY_NUDGE,
  NUDGE_EVERY_MS,
  NUDGE_KEY,
  invitedSomeone,
  nextNudge,
  nudgeKind,
  nudgeTriggers,
  readNudge,
} from '@modules/crypto/domain/invite';
import type { ClosedTrade, SeasonResult, SimPortfolio } from '@modules/crypto/domain/types';
import { CryptoConsoleView } from '@modules/crypto/ui/CryptoConsoleView';
import { RANKING_INTRO_KEY } from '@modules/crypto/ui/RankingCard';
import { SEEN_KEY } from '@modules/crypto/ui/SeasonPanel';
import * as fx from '@test-utils/crypto';
import { createFakeApi, type FakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders } from '@test-utils/render';

jest.mock('@core/analytics', () => ({ track: jest.fn() }));

// Every result and code here is made up.
const LINK = 'https://finanverso.app/?ref=ABCD2345';
const NOW = Date.parse('2026-03-15T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

const closed = (pnl: number): ClosedTrade => ({
  id: `c${pnl}`,
  symbol: 'ETH',
  slot: 1,
  direction: 'long',
  quantity: 0.5,
  entryPrice: 2_000,
  exitPrice: 2_000 + pnl * 2,
  invested: 1_000,
  fees: 2,
  proceeds: 1_000 + pnl,
  pnl,
  pnlPercent: pnl / 10,
  openType: 'market',
  closeType: 'limit',
  openedAt: '2026-03-10T12:00:00.000Z',
  closedAt: '2026-03-11T12:00:00.000Z',
  transfer: null,
});
const result = (r: Partial<SeasonResult> = {}): SeasonResult => ({
  season: '2026-02',
  initial: 10_000,
  final: 11_250,
  percent: 12.5,
  trades: 9,
  wins: 6,
  activeDays: 7,
  qualified: true,
  ranked: true,
  place: null,
  prizeDays: 0,
  ...r,
});
const withHistory = (history: SeasonResult[]) => ({
  season: { ...fx.portfolio().season, history },
});
/** Nobody invited yet: the notice may show. */
const fresh = f.referral({ qualified: 0, pending: 0, rewardsEarned: 0, missing: 1, nextAt: 1 });

function setup({
  portfolio = {},
  referral = fresh,
  change,
}: {
  portfolio?: Partial<SimPortfolio>;
  referral?: ReturnType<typeof f.referral> | Error;
  change?: (api: FakeApi) => void;
} = {}) {
  const api = createFakeApi();
  api.cryptoApi.portfolio.mockResolvedValue(fx.portfolio(portfolio));
  if (referral instanceof Error) api.billingApi.referral.mockRejectedValue(referral);
  else api.billingApi.referral.mockResolvedValue(referral);
  change?.(api);
  const view = renderWithProviders(<CryptoConsoleView />, { api });
  return { ...view, api };
}
const card = () => screen.findByRole('region', { name: 'Invita a un amigo y competid' });
const nudge = () => screen.queryByRole('complementary', { name: /operación con resultado/ });
const saved = () => readNudge(JSON.parse(localStorage.getItem(NUDGE_KEY) ?? 'null'));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(RANKING_INTRO_KEY, '1');
  jest.mocked(track).mockClear();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
  Object.assign(navigator, { share: undefined });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Invite a friend in the console: the card', () => {
  it('shows the real reward, the link without personal data and the counters', async () => {
    setup({ referral: f.referral() });
    const section = await card();
    expect(section).toHaveTextContent(
      'recibe 30 días de Premium y tú sumas meses de Premium (hasta 5)'
    );
    expect(section).toHaveTextContent('Operar en la consola no cuenta para la invitación.');
    expect(within(section).getByLabelText('Tu enlace de invitación')).toHaveTextContent(LINK);
    expect(section).toHaveTextContent(
      'Tus invitaciones: 2 completadas · 1 en camino · 1 de 5 meses conseguidos.'
    );
    expect(track).toHaveBeenCalledWith('cons_invite_view');
    // Already invited someone: the card stays, the notice does not come.
    expect(nudge()).toBeNull();
  });

  it('copies the link, says so for a moment and counts it', async () => {
    setup();
    const section = await card();
    jest.useFakeTimers();
    fireEvent.click(within(section).getByRole('button', { name: 'Copiar enlace' }));
    await act(async () => undefined);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(LINK);
    expect(within(section).getByRole('button', { name: '¡Copiado!' })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('cons_invite_copy');
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(within(section).getByRole('button', { name: 'Copiar enlace' })).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('says how to copy by hand when the clipboard refuses', async () => {
    jest.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('denied'));
    setup();
    const section = await card();
    fireEvent.click(within(section).getByRole('button', { name: 'Copiar enlace' }));
    expect(await within(section).findByRole('status')).toHaveTextContent(
      'Mantén pulsado el enlace para copiarlo a mano.'
    );
    expect(track).not.toHaveBeenCalledWith('cons_invite_copy');
  });

  it('shares with the system sheet, and a cancelled share is not counted', async () => {
    const share = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share });
    setup();
    const section = await card();
    fireEvent.click(within(section).getByRole('button', { name: 'Compartir' }));
    await waitFor(() => expect(track).toHaveBeenCalledWith('cons_invite_share'));
    expect(share).toHaveBeenCalledWith({
      title: 'Finanverso',
      text: expect.stringContaining('tienes 30 días de Premium'),
      url: LINK,
    });
    jest.mocked(track).mockClear();
    share.mockRejectedValue(new DOMException('cancel', 'AbortError'));
    fireEvent.click(within(section).getByRole('button', { name: 'Compartir' }));
    await act(async () => undefined);
    expect(track).not.toHaveBeenCalled();
  });

  it('copies instead where the browser cannot share', async () => {
    setup();
    const section = await card();
    fireEvent.click(within(section).getByRole('button', { name: 'Compartir' }));
    expect(await within(section).findByRole('button', { name: '¡Copiado!' })).toBeInTheDocument();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(LINK);
  });

  it('offers nothing when the invitation programme does not answer', async () => {
    setup({ referral: new Error('off'), portfolio: { closed: [closed(40)] } });
    await screen.findByRole('heading', { name: /Temporada de marzo de 2026/ });
    await act(async () => undefined);
    expect(screen.queryByRole('region', { name: 'Invita a un amigo y competid' })).toBeNull();
    expect(nudge()).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });
});

describe('Invite a friend in the console: the notice', () => {
  it('comes after the first trade closed with a gain, closes and does not come back', async () => {
    const first = setup({ portfolio: { closed: [closed(-10), closed(40)] } });
    await card();
    const notice = await screen.findByRole('complementary', {
      name: 'Has cerrado una operación con resultado positivo',
    });
    expect(notice).toHaveTextContent('competid en el ranking con el mismo dinero virtual');
    expect(notice).toHaveTextContent('recibe 30 días de Premium y tú sumas meses (hasta 5)');
    expect(saved()).toEqual({ at: NOW, done: ['win'], open: 'win' });
    fireEvent.click(within(notice).getByRole('button', { name: 'Ahora no' }));
    expect(nudge()).toBeNull();
    expect(saved()).toEqual({ at: NOW, done: ['win'], open: null });
    first.unmount();
    // Weeks later, the same event does not bring it back.
    jest.mocked(Date.now).mockReturnValue(NOW + 30 * DAY);
    setup({ portfolio: { closed: [closed(40)] } });
    await card();
    expect(nudge()).toBeNull();
  });

  it('stays until closed, and using its link settles it', async () => {
    localStorage.setItem(NUDGE_KEY, JSON.stringify({ at: NOW - DAY, done: ['win'], open: 'win' }));
    setup();
    const notice = await screen.findByRole('complementary', { name: /resultado positivo/ });
    fireEvent.click(within(notice).getByRole('button', { name: 'Copiar enlace' }));
    expect(await within(notice).findByRole('button', { name: '¡Copiado!' })).toBeInTheDocument();
    expect(saved().open).toBeNull();
    expect(nudge()).not.toBeNull();
  });

  it('comes on getting a place in the ranking', async () => {
    setup({
      change: (api) =>
        api.cryptoApi.ranking.mockResolvedValue(
          fx.ranking({ me: { ...fx.ranking().me, place: 4, qualified: true } })
        ),
    });
    expect(
      await screen.findByRole('complementary', { name: 'Ya tienes puesto en el ranking del mes' })
    ).toBeInTheDocument();
  });

  it('comes with the summary of the season that ended, not once it was seen', async () => {
    const first = setup({ portfolio: withHistory([result()]) });
    expect(
      await screen.findByRole('complementary', { name: 'Temporada de febrero terminada' })
    ).toBeInTheDocument();
    first.unmount();
    localStorage.clear();
    localStorage.setItem(RANKING_INTRO_KEY, '1');
    localStorage.setItem(SEEN_KEY, '2026-02');
    setup({ portfolio: withHistory([result()]) });
    await card();
    expect(screen.queryByRole('complementary', { name: /Temporada de febrero/ })).toBeNull();
  });

  it('waits 7 days after the last one, using up what happened in between', async () => {
    localStorage.setItem(NUDGE_KEY, JSON.stringify({ at: NOW - 2 * DAY, done: [], open: null }));
    setup({ portfolio: { closed: [closed(40)] } });
    await card();
    await waitFor(() => expect(saved().done).toEqual(['win']));
    expect(nudge()).toBeNull();
  });

  it('waits for the first notice of the ranking to be closed', async () => {
    localStorage.removeItem(RANKING_INTRO_KEY);
    setup({ portfolio: { closed: [closed(40)] } });
    await card();
    expect(nudge()).toBeNull();
    expect(localStorage.getItem(NUDGE_KEY)).toBeNull();
  });
});

describe('Invite a friend in the console: when to tell', () => {
  const portfolio = (p: Partial<SimPortfolio> = {}) => fx.portfolio(p);

  it('reads only what it saved', () => {
    expect(readNudge(null)).toEqual(EMPTY_NUDGE);
    expect(readNudge('x')).toEqual(EMPTY_NUDGE);
    expect(readNudge({ at: Infinity, done: ['win', 3], open: 7 })).toEqual({
      at: null,
      done: ['win'],
      open: null,
    });
    expect(readNudge({ at: 5, done: 'win', open: 'ranking' })).toEqual({
      at: 5,
      done: [],
      open: 'ranking',
    });
  });

  it('lists the good moments, the newest first', () => {
    const ranked = fx.ranking({ me: { ...fx.ranking().me, place: 2 } });
    const all = portfolio({ closed: [closed(5)], ...withHistory([result()]) });
    expect(nudgeTriggers(all, ranked, null)).toEqual(['season:2026-02', 'ranking', 'win']);
    expect(nudgeTriggers(all, ranked, '2026-02')).toEqual(['ranking', 'win']);
    expect(nudgeTriggers(portfolio({ closed: [closed(-5), closed(0)] }), null, null)).toEqual([]);
    expect(nudgeTriggers(portfolio(), fx.ranking(), null)).toEqual([]);
    expect(nudgeKind('season:2026-02')).toBe('season');
    expect(nudgeKind('win')).toBe('win');
  });

  it('knows when someone was invited', () => {
    expect(invitedSomeone(fresh)).toBe(false);
    expect(invitedSomeone({ ...fresh, pending: 1 })).toBe(true);
    expect(invitedSomeone({ ...fresh, qualified: 1 })).toBe(true);
  });

  it('shows one notice every 7 days at most', () => {
    const first = nextNudge(EMPTY_NUDGE, ['ranking', 'win'], NOW);
    expect(first).toEqual({
      open: 'ranking',
      memory: { at: NOW, done: ['ranking', 'win'], open: 'ranking' },
    });
    // On screen until closed, for 7 days at most.
    expect(nextNudge(first.memory, [], NOW + DAY).open).toBe('ranking');
    expect(nextNudge(first.memory, [], NOW + NUDGE_EVERY_MS)).toEqual({
      open: null,
      memory: { ...first.memory, open: null },
    });
    const closedOne = { ...first.memory, open: null };
    expect(nextNudge(closedOne, ['season:2026-03'], NOW + DAY)).toEqual({
      open: null,
      memory: { ...closedOne, done: ['ranking', 'win', 'season:2026-03'] },
    });
    expect(nextNudge(closedOne, ['season:2026-03'], NOW + NUDGE_EVERY_MS).open).toBe(
      'season:2026-03'
    );
    // Only the latest events are remembered.
    const many = Array.from({ length: 30 }, (_, i) => `season:${i}`);
    expect(nextNudge(EMPTY_NUDGE, many, NOW).memory.done).toHaveLength(24);
  });
});
