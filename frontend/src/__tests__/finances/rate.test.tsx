import { act, render, screen } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { track } from '@core/analytics';
import {
  MIN_ACCOUNT_DAYS,
  RETRY_DAYS,
  REVIEW_DELAY_MS,
  askForReview,
  canAskForReview,
  recordOpen,
  requestStoreReview,
  resetReviewSessionForTests,
  storeListingUrl,
} from '@core/review/review';
import { RatePrompt } from '@modules/finances/ui/components/RatePrompt';
import { I18nProvider } from '@core/i18n/I18nContext';
import { tr } from '@test-utils/render';

const inAppReview = { requestReview: jest.fn() };
jest.mock('@capacitor-community/in-app-review', () => ({ InAppReview: inAppReview }));
jest.mock('@core/analytics', () => ({ track: jest.fn() }));

const DAY = 24 * 60 * 60 * 1000;
const day = (n: number) => new Date(Date.UTC(2026, 2, n, 12));
const stored = () => JSON.parse(localStorage.getItem('mm_review') as string);
const native = () => jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

/** The app was first opened on day 1, in an earlier run: this run is not the first session. */
const openedBefore = () => {
  recordOpen(day(1));
  resetReviewSessionForTests();
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mm_locale', 'es');
  jest.clearAllMocks();
  resetReviewSessionForTests();
  inAppReview.requestReview.mockResolvedValue(undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('days the app is opened', () => {
  it('counts a day once and keeps the last thirty, with the first one apart', () => {
    recordOpen(day(1));
    recordOpen(day(1));
    for (let i = 2; i <= 31; i++) recordOpen(day(i));
    expect(stored().days).toHaveLength(30);
    expect(stored().firstSeen).toBe(day(1).toISOString().slice(0, 10));
  });

  it('uses the first open day of states saved before it was kept', () => {
    localStorage.setItem(
      'mm_review',
      JSON.stringify({ days: ['2026-03-01'], askedAt: null, done: false })
    );
    recordOpen(day(2));
    expect(stored().firstSeen).toBe('2026-03-01');
  });

  it('counts whoever answered the old question as asked that day, once', () => {
    localStorage.setItem(
      'mm_review',
      JSON.stringify({ days: ['2026-03-01'], firstSeen: '2026-03-01', askedAt: null, done: true })
    );
    recordOpen(day(1));
    expect(stored()).toEqual({
      days: ['2026-03-01'],
      firstSeen: '2026-03-01',
      askedAt: day(1).toISOString(),
    });
    localStorage.setItem(
      'mm_review',
      JSON.stringify({ days: ['2026-03-01'], askedAt: '2026-02-01T00:00:00.000Z', done: true })
    );
    recordOpen(day(3));
    expect(stored()).toEqual({
      days: ['2026-03-01', '2026-03-03'],
      firstSeen: '2026-03-01',
      askedAt: '2026-02-01T00:00:00.000Z',
    });
  });
});

describe('when the review sheet may be requested', () => {
  it('only in the Android app', () => {
    openedBefore();
    expect(canAskForReview(day(10))).toBe(false);
    native();
    expect(canAskForReview(day(10))).toBe(true);
  });

  it('never in the first session, nor before the app is 3 days old, nor unopened', () => {
    native();
    expect(canAskForReview(day(10))).toBe(false); // never opened
    recordOpen(day(1));
    expect(canAskForReview(day(10))).toBe(false); // the first run of the app
    resetReviewSessionForTests();
    expect(canAskForReview(day(1 + MIN_ACCOUNT_DAYS - 1))).toBe(false);
    expect(canAskForReview(day(1 + MIN_ACCOUNT_DAYS))).toBe(true);
  });

  it('at most once every 90 days', async () => {
    native();
    openedBefore();
    jest.useFakeTimers();
    const asked = askForReview('goal_reached', day(10));
    expect(RETRY_DAYS).toBe(90);
    expect(canAskForReview(new Date(day(10).getTime() + 89 * DAY))).toBe(false);
    expect(canAskForReview(new Date(day(10).getTime() + 91 * DAY))).toBe(true);
    await act(async () => {
      jest.advanceTimersByTime(REVIEW_DELAY_MS);
    });
    await asked;
  });
});

describe('askForReview', () => {
  it('requests Google’s sheet a moment after the achievement, with no question first', async () => {
    native();
    openedBefore();
    jest.useFakeTimers();
    const asked = askForReview('autonomo_draft', day(10));
    expect(track).toHaveBeenCalledWith('review_request', { detail: 'autonomo_draft' });
    expect(stored().askedAt).toBe(day(10).toISOString());
    expect(inAppReview.requestReview).not.toHaveBeenCalled(); // the result is seen first
    await act(async () => {
      jest.advanceTimersByTime(REVIEW_DELAY_MS);
    });
    expect(await asked).toBe(true);
    expect(inAppReview.requestReview).toHaveBeenCalledTimes(1);
    // A second achievement the same day asks nothing more.
    expect(await askForReview('goal_reached', day(10))).toBe(false);
    expect(inAppReview.requestReview).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('does nothing on the web, and uses today when no date is given', async () => {
    openedBefore();
    expect(await askForReview('dp_recovered')).toBe(false);
    expect(track).not.toHaveBeenCalled();
    expect(stored().askedAt).toBeNull();
  });

  it('survives the plugin failing', async () => {
    native();
    openedBefore();
    inAppReview.requestReview.mockRejectedValueOnce(new Error('no play'));
    jest.useFakeTimers();
    const asked = askForReview('goal_reached', day(10));
    await act(async () => {
      jest.advanceTimersByTime(REVIEW_DELAY_MS);
    });
    expect(await asked).toBe(false);
  });
});

describe('store links', () => {
  it('link to the Play listing: the store app on Android, the web page elsewhere', () => {
    expect(storeListingUrl()).toBe(
      'https://play.google.com/store/apps/details?id=com.jgarciamat.moneymanager'
    );
    native();
    expect(storeListingUrl()).toBe('market://details?id=com.jgarciamat.moneymanager');
  });

  it('opens the Google Play sheet in the Android app and nowhere else', async () => {
    expect(await requestStoreReview()).toBe(false);
    native();
    expect(await requestStoreReview()).toBe(true);
  });
});

describe('RatePrompt', () => {
  it('offers the same two ways to everybody, without asking anything first', () => {
    render(
      <I18nProvider>
        <RatePrompt />
      </I18nProvider>
    );
    expect(screen.getByRole('region', { name: tr('app.rate.title') })).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('link', { name: tr('app.rate.store') }).getAttribute('href')).toContain(
      'play.google.com/store/apps/details?id=com.jgarciamat.moneymanager'
    );
    expect(screen.getByRole('link', { name: tr('app.rate.write') }).getAttribute('href')).toContain(
      'mailto:support@finanverso.app'
    );
    expect(inAppReview.requestReview).not.toHaveBeenCalled();
  });
});
