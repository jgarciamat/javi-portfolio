import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import {
  MIN_ACCOUNT_DAYS,
  MIN_DAYS,
  MIN_MOVEMENTS,
  RETRY_DAYS,
  finishReview,
  recordOpen,
  recordPositiveMoment,
  requestStoreReview,
  shouldAskForReview,
  snoozeReview,
  storeListingUrl,
} from '@core/review/review';
import { RatePrompt } from '@modules/finances/ui/components/RatePrompt';
import { I18nProvider } from '@core/i18n/I18nContext';
import { tr } from '@test-utils/render';

const inAppReview = { requestReview: jest.fn() };
jest.mock('@capacitor-community/in-app-review', () => ({ InAppReview: inAppReview }));

const day = (n: number) => new Date(Date.UTC(2026, 2, n, 12));

/** Seeds the state as if the app had been opened on `days` different days. */
const openOn = (days: number) => {
  for (let i = 1; i <= days; i++) recordOpen(day(i));
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mm_locale', 'es');
  jest.clearAllMocks();
  inAppReview.requestReview.mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('review timing', () => {
  it('asks only after enough days and movements', () => {
    openOn(MIN_DAYS - 1);
    expect(shouldAskForReview(MIN_MOVEMENTS, day(10))).toBe(false);
    recordOpen(day(9));
    expect(shouldAskForReview(MIN_MOVEMENTS - 1, day(10))).toBe(false);
    expect(shouldAskForReview(MIN_MOVEMENTS, day(10))).toBe(true);
  });

  it('counts a day once and keeps the last thirty', () => {
    recordOpen(day(1));
    recordOpen(day(1));
    for (let i = 2; i <= 31; i++) recordOpen(day(i));
    expect(JSON.parse(localStorage.getItem('mm_review') as string).days).toHaveLength(30);
  });

  it('waits after a "later" and never asks again once finished', () => {
    openOn(MIN_DAYS);
    snoozeReview(day(10));
    expect(shouldAskForReview(MIN_MOVEMENTS, day(11))).toBe(false);
    const later = new Date(day(10).getTime() + (RETRY_DAYS + 1) * 24 * 60 * 60 * 1000);
    expect(shouldAskForReview(MIN_MOVEMENTS, later)).toBe(true);
    finishReview();
    expect(shouldAskForReview(MIN_MOVEMENTS, later)).toBe(false);
  });
});

describe('positive moments', () => {
  it('ask after a happy moment even with few movements, once the account is 3 days old', () => {
    recordOpen(day(1));
    recordPositiveMoment();
    recordPositiveMoment();
    expect(shouldAskForReview(0, day(1 + MIN_ACCOUNT_DAYS - 1))).toBe(false);
    expect(shouldAskForReview(0, day(1 + MIN_ACCOUNT_DAYS))).toBe(true);
  });

  it('keep the first day even when only the last thirty are stored, and never ask unopened', () => {
    expect(shouldAskForReview(MIN_MOVEMENTS, day(20))).toBe(false);
    for (let i = 1; i <= 31; i++) recordOpen(day(i));
    expect(JSON.parse(localStorage.getItem('mm_review') as string).firstSeen).toBe(
      day(1).toISOString().slice(0, 10)
    );
  });

  it('use the first open day of states saved before it was kept, and do not ask without usage', () => {
    localStorage.setItem(
      'mm_review',
      JSON.stringify({ days: ['2026-03-01'], askedAt: null, done: false })
    );
    expect(shouldAskForReview(MIN_MOVEMENTS, day(20))).toBe(false);
    recordOpen(day(2));
    expect(JSON.parse(localStorage.getItem('mm_review') as string).firstSeen).toBe('2026-03-01');
  });

  it('never ask more than once every 90 days', () => {
    recordOpen(day(1));
    recordPositiveMoment();
    snoozeReview(day(10));
    expect(RETRY_DAYS).toBe(90);
    expect(shouldAskForReview(0, new Date(day(10).getTime() + 89 * 24 * 3600 * 1000))).toBe(false);
  });

  it('link to the Play listing: the store app on Android, the web page elsewhere', () => {
    expect(storeListingUrl()).toBe(
      'https://play.google.com/store/apps/details?id=com.jgarciamat.moneymanager'
    );
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    expect(storeListingUrl()).toBe('market://details?id=com.jgarciamat.moneymanager');
  });
});

describe('requestStoreReview', () => {
  it('opens the Google Play sheet in the Android app and nowhere else', async () => {
    expect(await requestStoreReview()).toBe(false);
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    expect(await requestStoreReview()).toBe(true);
    inAppReview.requestReview.mockRejectedValueOnce(new Error('no play'));
    expect(await requestStoreReview()).toBe(false);
  });
});

describe('RatePrompt', () => {
  const mount = (movements = MIN_MOVEMENTS, onInvite = jest.fn()) => {
    openOn(MIN_DAYS);
    render(
      <I18nProvider>
        <RatePrompt movements={movements} onInvite={onInvite} />
      </I18nProvider>
    );
    return onInvite;
  };

  it('stays hidden for people who have not used the app enough', () => {
    mount(MIN_MOVEMENTS - 1);
    expect(screen.queryByText(tr('app.rate.title'))).toBeNull();
  });

  it('thanks the people who like it on the web and offers to invite a friend', async () => {
    const onInvite = mount();
    fireEvent.click(await screen.findByRole('button', { name: tr('app.rate.yes') }));
    expect(await screen.findByText(tr('app.rate.thanks'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: tr('app.rate.store') }).getAttribute('href')).toContain(
      'play.google.com/store/apps/details?id=com.jgarciamat.moneymanager'
    );
    fireEvent.click(screen.getByRole('button', { name: tr('app.rate.invite') }));
    expect(onInvite).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: tr('app.common.close') }));
    expect(screen.queryByRole('region')).toBeNull();
    expect(shouldAskForReview(MIN_MOVEMENTS, day(11))).toBe(false);
  });

  it('opens the store sheet inside the Android app and goes away', async () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: tr('app.rate.yes') }));
    await waitFor(() => expect(inAppReview.requestReview).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('region')).toBeNull());
  });

  it('asks what to improve, with a way to write, and does not insist', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: tr('app.rate.no') }));
    const write = await screen.findByRole('link', { name: tr('app.rate.write') });
    expect(write.getAttribute('href')).toContain('mailto:moneymanager@outlook.es');
    fireEvent.click(write);
    expect(screen.queryByRole('region')).toBeNull();
    expect(shouldAskForReview(MIN_MOVEMENTS, day(11))).toBe(false);
  });

  it('can be closed from the feedback step and postponed with "later"', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: tr('app.rate.no') }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.common.close') }));
    expect(screen.queryByRole('region')).toBeNull();
    localStorage.clear();
    mount();
    fireEvent.click(await screen.findByRole('button', { name: tr('app.rate.later') }));
    expect(screen.queryByRole('region')).toBeNull();
  });
});
