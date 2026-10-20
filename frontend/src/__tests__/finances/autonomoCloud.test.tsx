import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { BusinessView } from '@modules/finances/ui/views/BusinessView';
import { ApiError } from '@core/api/http';
import {
  NO_EXTRAS,
  emptyManual,
  type ManualForm,
} from '@modules/finances/ui/components/AutonomoManual';
import {
  CLOUD_KEY,
  PREVIOUS_KEY,
  decide,
  hashOf,
  isEmpty,
  toSaved,
  type AutonomoSaved,
} from '@modules/finances/ui/components/autonomoSync';
import { toInvoices } from '@modules/finances/domain/invoiceLedger';
import type { AutonomoCloudCopy } from '@modules/finances/domain/types';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { translate } from '@core/i18n/I18nContext';

const NOW = '2027-01-18T12:00:00.000Z';

/** The form with some fields set, as the account keeps it. */
const form = (over: Partial<ManualForm> = {}, kinds = {}): AutonomoSaved =>
  toSaved({ ...emptyManual(), ...over }, NO_EXTRAS, kinds);
const withIncome = (r21: string, quarter = 3) => {
  const manual = emptyManual();
  manual.quarters[quarter].income.r21 = r21;
  return manual;
};
const copy = (
  data: unknown,
  version = 2,
  updatedAt = '2026-10-18T11:00:00.000Z'
): AutonomoCloudCopy => ({ data, unreadable: false, version, updatedAt });
const networkError = () => new ApiError('Sin conexión', 0, 'NETWORK_ERROR');

interface Setup {
  /** What the device remembers about the account copy. */
  cloud?: object;
  manual?: Partial<ManualForm>;
  remote?: AutonomoCloudCopy | null;
}

async function setup({ cloud, manual, remote }: Setup = {}) {
  if (cloud) localStorage.setItem(CLOUD_KEY, JSON.stringify(cloud));
  if (manual) {
    localStorage.setItem('mm_autonomo_manual2', JSON.stringify({ ...emptyManual(), ...manual }));
  }
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
  if (remote !== undefined) api.businessApi.data.mockResolvedValue(remote);
  api.businessApi.saveData.mockResolvedValue({ version: 1, updatedAt: NOW });
  const view = renderWithProviders(<BusinessView />, { api, plan: true });
  await screen.findByLabelText(tr('app.autonomo.workArea'));
  return view;
}

const toggle = () =>
  screen.getByRole('switch', { name: tr('app.autonomo.cloud.toggle') }) as HTMLInputElement;
const sync = () => document.querySelector('.autonomo-sync') as HTMLElement;
const income = () =>
  screen.getByLabelText(`${tr('app.autonomo.income.r21')} 4`) as HTMLInputElement;
const type = (value: string) => fireEvent.change(income(), { target: { value } });
const wait = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });
const stored = () => JSON.parse(localStorage.getItem(CLOUD_KEY) as string);
const dialog = () => screen.getByRole('dialog');

beforeEach(() => {
  localStorage.clear();
  // Everything together (the assistant has its own suite).
  localStorage.setItem('mm_autonomo_assistant', 'expert');
  jest.useFakeTimers({
    now: new Date(NOW),
    doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'],
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('The form as the account keeps it', () => {
  it('has the same fields in the same order, whatever the device had', () => {
    const invoices = toInvoices(
      'received',
      [
        {
          date: '2026-02-01',
          quarter: 1,
          base: 100,
          vatRate: 21,
          vat: 21,
          total: 121,
          withheld: 0,
          concept: 'Luz',
        },
      ],
      {},
      []
    );
    const saved = toSaved(
      {
        ...emptyManual(),
        invoices: invoices.map((i) => ({ ...i, extra: 'x' })) as ManualForm['invoices'],
        model130: { year: 2026, quarter: 2, income: 10, expenses: 5 },
      },
      { hardToJustify: true },
      { zeta: 'rent', alfa: 'software' }
    );
    expect(saved.manual.invoices[0]).toEqual({ ...invoices[0], period: null });
    expect(saved.manual.model130).toEqual({ year: 2026, quarter: 2, income: 10, expenses: 5 });
    expect(saved.extras).toEqual({ ...NO_EXTRAS, hardToJustify: true });
    expect(Object.keys(saved.kinds)).toEqual(['alfa', 'zeta']);
    const typed = emptyManual();
    typed.quarters[0].expenses = [
      { kind: 'meals', amount: '30', vatRate: 10, days: '2', note: 'x' } as never,
    ];
    expect(toSaved(typed, {}, {}).manual.quarters[0].expenses).toEqual([
      { kind: 'meals', amount: '30', vatRate: 10, days: '2' },
    ]);
    // Older data with parts missing takes their empty values.
    expect(toSaved({}, {}, {})).toEqual(form());
  });

  it('counts a form as empty without looking at the kinds remembered per supplier', () => {
    expect(isEmpty(form({}, { luz: 'supplies' }))).toBe(true);
    expect(isEmpty(form({ quarters: withIncome('1').quarters }))).toBe(false);
    expect(isEmpty({ ...form(), extras: { ...NO_EXTRAS, exempt: true } })).toBe(false);
    expect(hashOf('a')).not.toBe(hashOf('b'));
  });

  it('decides which copy wins', () => {
    const local = form({ quarters: withIncome('100').quarters });
    const other = form({ quarters: withIncome('200').quarters });
    const synced = hashOf(JSON.stringify(local));
    const none = { version: null, synced: null };
    expect(decide(null, form(), none)).toEqual({ kind: 'same' });
    expect(decide(null, local, none)).toEqual({ kind: 'push', base: null });
    expect(decide({ ...copy(null, 4), unreadable: true }, local, none)).toEqual({
      kind: 'push',
      base: 4,
    });
    expect(decide(copy(local), local, none)).toEqual({ kind: 'same' });
    // A copy with parts missing reads as their empty values.
    expect(decide(copy({}), form(), none)).toEqual({ kind: 'same' });
    expect(decide(copy(other, 3), local, { version: 3, synced: 'old' })).toEqual({
      kind: 'push',
      base: 3,
    });
    expect(decide(copy(other, 3), form(), none)).toEqual({ kind: 'take', data: other });
    // Even when this device had that version: its data was cleared, not changed.
    expect(decide(copy(other, 3), form(), { version: 3, synced: 'x' })).toEqual({
      kind: 'take',
      data: other,
    });
    expect(decide(copy(other, 3), local, { version: 2, synced })).toEqual({
      kind: 'take',
      data: other,
    });
    expect(decide(copy(other, 3), local, { version: 2, synced: 'changed' })).toEqual({
      kind: 'ask',
      data: other,
    });
    expect(decide(copy(other, 3), local, none)).toEqual({ kind: 'ask', data: other });
  });
});

describe('Saving in the account', () => {
  it('is off by default: nothing leaves the device', async () => {
    const { api } = await setup();
    expect(toggle().checked).toBe(false);
    expect(screen.getByText(tr('app.autonomo.cloud.whereDevice'))).toBeInTheDocument();
    expect(screen.getByText(tr('app.autonomo.cloud.toggleHint'))).toBeInTheDocument();
    type('1000');
    await wait(5000);
    expect(api.businessApi.data).not.toHaveBeenCalled();
    expect(api.businessApi.saveData).not.toHaveBeenCalled();
    expect(sync()).toBeNull();
  });

  it('once on, saves what is on the device and then each change after a pause', async () => {
    const { api } = await setup({ manual: withIncome('1000') });
    fireEvent.click(toggle());
    await waitFor(() =>
      expect(api.businessApi.saveData).toHaveBeenCalledWith(
        form({ quarters: withIncome('1000').quarters }),
        null
      )
    );
    expect(sync()).toHaveTextContent(tr('app.autonomo.cloud.status.savedNow'));
    expect(screen.getByText(tr('app.autonomo.cloud.whereBoth'))).toBeInTheDocument();
    expect(stored()).toMatchObject({ on: true, version: 1, savedAt: NOW });

    // Typing: one save, a moment after the last key.
    api.businessApi.saveData.mockResolvedValue({ version: 2, updatedAt: NOW });
    type('1001');
    await wait(1000);
    type('1002');
    await wait(1000);
    expect(api.businessApi.saveData).toHaveBeenCalledTimes(1);
    await wait(500);
    await waitFor(() => expect(api.businessApi.saveData).toHaveBeenCalledTimes(2));
    expect(api.businessApi.saveData).toHaveBeenLastCalledWith(
      form({ quarters: withIncome('1002').quarters }),
      1
    );
    await waitFor(() => expect(stored().version).toBe(2));
    // A minute later it says when.
    await wait(60_000);
    expect(sync()).toHaveTextContent(/14:00|12:00/);
    expect(sync()).not.toHaveTextContent(tr('app.autonomo.cloud.status.savedNow'));
  });

  it('says it is ready when there is nothing to save yet', async () => {
    const { api } = await setup();
    fireEvent.click(toggle());
    await waitFor(() => expect(sync()).toHaveTextContent(tr('app.autonomo.cloud.status.ready')));
    expect(api.businessApi.saveData).not.toHaveBeenCalled();
  });

  it('brings in the account copy when it is newer and nothing changed here', async () => {
    const mine = withIncome('100');
    const theirs = form({ quarters: withIncome('900').quarters }, { luz: 'supplies' });
    const { api } = await setup({
      manual: mine,
      cloud: {
        on: true,
        version: 1,
        synced: hashOf(JSON.stringify(form({ quarters: mine.quarters }))),
      },
      remote: copy(theirs, 2),
    });
    await waitFor(() => expect(income().value).toBe('900'));
    expect(JSON.parse(localStorage.getItem('mm_autonomo_kinds') as string)).toEqual({
      luz: 'supplies',
    });
    expect(stored()).toMatchObject({ version: 2, savedAt: '2026-10-18T11:00:00.000Z' });
    await wait(5000);
    expect(api.businessApi.saveData).not.toHaveBeenCalled();
  });

  it('brings in the account copy on an empty device (a cleared browser)', async () => {
    await setup({ cloud: { on: true }, remote: copy({ manual: withIncome('750') }, 5) });
    await waitFor(() => expect(income().value).toBe('750'));
  });

  it('brings in where the person was in the step-by-step assistant too', async () => {
    const wizard = {
      at: 1,
      screen: 0,
      done: ['activity'],
      answers: { regime: 'general' },
      streak: 1,
      lastDay: '2026-10-17',
    };
    await setup({ cloud: { on: true }, remote: copy({ manual: withIncome('750'), wizard }, 5) });
    await waitFor(() => expect(income().value).toBe('750'));
    expect(JSON.parse(localStorage.getItem('mm_autonomo_wizard') as string)).toEqual(wizard);
  });

  it('does nothing when both copies are the same, and replaces one that cannot be read', async () => {
    const mine = withIncome('100');
    const first = await setup({
      manual: mine,
      cloud: { on: true },
      remote: copy(form({ quarters: mine.quarters }), 7),
    });
    await waitFor(() => expect(stored().version).toBe(7));
    expect(first.api.businessApi.saveData).not.toHaveBeenCalled();
    first.unmount();

    const second = await setup({
      manual: mine,
      cloud: { on: true, version: 7 },
      remote: { ...copy(null, 8), unreadable: true },
    });
    await waitFor(() =>
      expect(second.api.businessApi.saveData).toHaveBeenCalledWith(
        form({ quarters: mine.quarters }),
        8
      )
    );
  });

  it('sends a change made on this device only', async () => {
    const mine = withIncome('100');
    const { api } = await setup({
      manual: mine,
      cloud: { on: true, version: 3, synced: 'before the change' },
      remote: copy(form({ quarters: withIncome('50').quarters }), 3),
    });
    await waitFor(() =>
      expect(api.businessApi.saveData).toHaveBeenCalledWith(form({ quarters: mine.quarters }), 3)
    );
  });

  it('asks which copy to use when both changed, and keeps the other one aside', async () => {
    const mine = withIncome('100');
    const theirs = form({ quarters: withIncome('900').quarters });
    await setup({
      manual: mine,
      cloud: { on: true, version: 1, synced: 'old', changedAt: '2026-10-17T09:30:00.000Z' },
      remote: copy(theirs, 2),
    });
    await screen.findByRole('dialog', { name: tr('app.autonomo.cloud.conflict.title') });
    const [local, remote] = within(dialog()).getAllByRole('button').slice(0, 2);
    expect(local).toHaveTextContent(tr('app.autonomo.cloud.conflict.local'));
    expect(local).toHaveTextContent(/17 oct 2026/);
    expect(local).toHaveTextContent(/Ingresos: 100,00\s€/);
    expect(remote).toHaveTextContent(/Ingresos: 900,00\s€/);
    fireEvent.click(remote);
    expect(income().value).toBe('900');
    expect(screen.queryByRole('dialog')).toBeNull();

    // The device's copy is kept: it can come back (and the account one is kept in turn).
    const kept = screen.getByRole('group', { name: tr('app.autonomo.cloud.previous.label') });
    expect(JSON.parse(localStorage.getItem(PREVIOUS_KEY) as string).data).toEqual(
      form({ quarters: mine.quarters })
    );
    fireEvent.click(
      within(kept).getByRole('button', { name: tr('app.autonomo.cloud.previous.restore') })
    );
    expect(income().value).toBe('100');
    expect(JSON.parse(localStorage.getItem(PREVIOUS_KEY) as string).data).toEqual(theirs);
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.autonomo.cloud.previous.dismiss') })
    );
    expect(localStorage.getItem(PREVIOUS_KEY)).toBeNull();
    expect(
      screen.queryByRole('group', { name: tr('app.autonomo.cloud.previous.label') })
    ).toBeNull();
  });

  it('keeps this device copy when chosen, sending it over the account one', async () => {
    const mine = withIncome('100');
    const { api } = await setup({
      manual: mine,
      cloud: { on: true },
      remote: copy(form({ quarters: withIncome('900').quarters }), 4),
    });
    await screen.findByRole('dialog');
    expect(dialog()).toHaveTextContent(tr('app.autonomo.cloud.conflict.noDate'));
    fireEvent.click(
      within(dialog()).getByRole('button', {
        name: new RegExp(tr('app.autonomo.cloud.conflict.local')),
      })
    );
    await waitFor(() =>
      expect(api.businessApi.saveData).toHaveBeenCalledWith(form({ quarters: mine.quarters }), 4)
    );
    expect(income().value).toBe('100');
    expect(
      JSON.parse(localStorage.getItem(PREVIOUS_KEY) as string).data.manual.quarters[3]
    ).toEqual(expect.objectContaining({ income: expect.objectContaining({ r21: '900' }) }));
  });

  it('lets the choice wait, saving nothing meanwhile', async () => {
    const { api } = await setup({
      manual: withIncome('100'),
      cloud: { on: true },
      remote: copy(form({ quarters: withIncome('900').quarters })),
    });
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.cloud.conflict.later') }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sync()).toHaveTextContent(tr('app.autonomo.cloud.status.conflict'));
    type('150');
    await wait(5000);
    expect(api.businessApi.saveData).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.cloud.conflict.choose') }));
    expect(dialog()).toBeInTheDocument();
  });

  it('waits for the connection when offline, and saves when it is back', async () => {
    const { api } = await setup({ manual: withIncome('100') });
    api.businessApi.saveData.mockRejectedValueOnce(networkError());
    fireEvent.click(toggle());
    await waitFor(() => expect(sync()).toHaveTextContent(tr('app.autonomo.cloud.status.offline')));
    // The same form is not sent again and again.
    await wait(5000);
    expect(api.businessApi.saveData).toHaveBeenCalledTimes(1);
    // Being back online tries again; so would a new change.
    fireEvent(window, new Event('online'));
    await waitFor(() => expect(api.businessApi.saveData).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(sync()).toHaveTextContent(tr('app.autonomo.cloud.status.savedNow')));
    // Online again while all is saved: nothing to do.
    fireEvent(window, new Event('online'));
    expect(api.businessApi.data).toHaveBeenCalledTimes(2);
  });

  it('looks again when another device saved first', async () => {
    const mine = withIncome('100');
    const { api } = await setup({ manual: mine, cloud: { on: true, version: 1, synced: 'x' } });
    await waitFor(() => expect(api.businessApi.saveData).toHaveBeenCalledTimes(1));
    // The account now has a newer copy than the one this device's save was based on.
    api.businessApi.saveData.mockRejectedValueOnce(
      new ApiError('Hay una copia más reciente', 409, 'AUTONOMO_DATA_CONFLICT')
    );
    api.businessApi.data.mockResolvedValue(copy(form({ quarters: withIncome('900').quarters }), 9));
    type('120');
    await wait(1500);
    await screen.findByRole('dialog');
  });

  it.each([
    ['unavailable', new ApiError('No', 503, 'AUTONOMO_SYNC_UNAVAILABLE')],
    ['tooLarge', new ApiError('Grande', 413, 'AUTONOMO_DATA_TOO_LARGE')],
    ['tooLarge', new ApiError('Grande', 413, 'PAYLOAD_TOO_LARGE')],
    ['error', new ApiError('Boom', 500, 'INTERNAL_ERROR')],
  ])('explains a failed save (%s) and can try again', async (key, error) => {
    const { api } = await setup({ manual: withIncome('100') });
    api.businessApi.saveData.mockRejectedValueOnce(error);
    fireEvent.click(toggle());
    await waitFor(() => expect(sync()).toHaveTextContent(tr(`app.autonomo.cloud.status.${key}`)));
    const retry = within(sync()).queryByRole('button', { name: tr('app.autonomo.cloud.retry') });
    if (key === 'tooLarge') {
      expect(retry).toBeNull();
      // A smaller form is tried again.
      type('1');
      await wait(1500);
      await waitFor(() => expect(api.businessApi.saveData).toHaveBeenCalledTimes(2));
      return;
    }
    fireEvent.click(retry as HTMLElement);
    await waitFor(() => expect(sync()).toHaveTextContent(tr('app.autonomo.cloud.status.savedNow')));
  });

  it('shows checking and saving while the requests are on their way', async () => {
    let answer: (value: AutonomoCloudCopy | null) => void = () => undefined;
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
    api.businessApi.data.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    let saved: (value: { version: number; updatedAt: string }) => void = () => undefined;
    api.businessApi.saveData.mockReturnValue(new Promise((resolve) => (saved = resolve)));
    localStorage.setItem(CLOUD_KEY, JSON.stringify({ on: true }));
    localStorage.setItem('mm_autonomo_manual2', JSON.stringify(withIncome('5')));
    renderWithProviders(<BusinessView />, { api, plan: true });
    await screen.findByLabelText(tr('app.autonomo.workArea'));
    expect(sync()).toHaveTextContent(tr('app.autonomo.cloud.status.checking'));
    await act(async () => answer(null));
    expect(sync()).toHaveTextContent(tr('app.autonomo.cloud.status.saving'));
    // A change while saving waits for the answer.
    type('6');
    await wait(1500);
    expect(api.businessApi.saveData).toHaveBeenCalledTimes(1);
    api.businessApi.saveData.mockResolvedValue({ version: 2, updatedAt: NOW });
    await act(async () => saved({ version: 1, updatedAt: NOW }));
    await wait(1500);
    await waitFor(() => expect(api.businessApi.saveData).toHaveBeenCalledTimes(2));
    expect(api.businessApi.saveData).toHaveBeenLastCalledWith(
      form({ quarters: withIncome('6').quarters }),
      1
    );
  });

  it('saves a change still waiting when leaving the screen', async () => {
    const { api, unmount } = await setup({ cloud: { on: true } });
    await waitFor(() => expect(sync()).toHaveTextContent(tr('app.autonomo.cloud.status.ready')));
    type('321');
    api.businessApi.saveData.mockRejectedValueOnce(networkError());
    unmount();
    expect(api.businessApi.saveData).toHaveBeenCalledWith(
      form({ quarters: withIncome('321').quarters }),
      null
    );
  });

  it('waits for the connection when the account cannot be reached on opening', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
    api.businessApi.data.mockRejectedValueOnce(networkError());
    localStorage.setItem(CLOUD_KEY, JSON.stringify({ on: true }));
    renderWithProviders(<BusinessView />, { api, plan: true });
    await waitFor(() => expect(sync()).toHaveTextContent(tr('app.autonomo.cloud.status.offline')));
  });

  it('says when it was saved, in English too', async () => {
    const mine = withIncome('100');
    localStorage.setItem(CLOUD_KEY, JSON.stringify({ on: true }));
    localStorage.setItem('mm_autonomo_manual2', JSON.stringify(mine));
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
    api.businessApi.data.mockResolvedValue(copy(form({ quarters: mine.quarters }), 3));
    api.settingsApi.get.mockResolvedValue(f.settings({ locale: 'en' }));
    renderWithProviders(<BusinessView />, { api, plan: true, locale: 'en' });
    await waitFor(() =>
      expect(sync()).toHaveTextContent(
        translate('en', 'app.autonomo.cloud.status.savedAt', {
          // The device's own time zone, as the app shows it (the CI runs in UTC).
          time: new Intl.DateTimeFormat('en-GB', { timeStyle: 'short' }).format(
            new Date('2026-10-18T11:00:00.000Z')
          ),
        })
      )
    );
  });

  it('keeps the other options on the device too', async () => {
    await setup();
    fireEvent.click(screen.getByLabelText(tr('app.autonomo.exempt')));
    expect(JSON.parse(localStorage.getItem('mm_autonomo_extras') as string)).toMatchObject({
      exempt: true,
    });
  });
});

describe('Turning it off', () => {
  const on = async () => {
    const view = await setup({ manual: withIncome('100'), cloud: { on: true } });
    await waitFor(() => expect(view.api.businessApi.saveData).toHaveBeenCalled());
    fireEvent.click(toggle());
    expect(dialog()).toHaveAccessibleName(tr('app.autonomo.cloud.off.title'));
    return view;
  };

  it('asks first; cancelling leaves it on', async () => {
    const { api } = await on();
    fireEvent.click(within(dialog()).getByRole('button', { name: tr('app.common.cancel') }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(toggle().checked).toBe(true);
    expect(api.businessApi.deleteData).not.toHaveBeenCalled();
  });

  it('can keep the account copy', async () => {
    const { api } = await on();
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.cloud.off.keep') }));
    await waitFor(() => expect(toggle().checked).toBe(false));
    expect(api.businessApi.deleteData).not.toHaveBeenCalled();
    expect(stored()).toMatchObject({ on: false, version: 1 });
    type('200');
    await wait(5000);
    expect(api.businessApi.saveData).toHaveBeenCalledTimes(1);
  });

  it('can delete the account copy too', async () => {
    const { api } = await on();
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.cloud.off.delete') }));
    await waitFor(() => expect(toggle().checked).toBe(false));
    expect(api.businessApi.deleteData).toHaveBeenCalled();
    expect(stored()).toMatchObject({ on: false, version: null, synced: null });
    // The data stays on the device.
    expect(income().value).toBe('100');
  });

  it('stays on when the account copy cannot be deleted', async () => {
    const { api } = await on();
    api.businessApi.deleteData.mockRejectedValueOnce(networkError());
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.cloud.off.delete') }));
    await waitFor(() =>
      expect(sync()).toHaveTextContent(tr('app.autonomo.cloud.status.deleteFailed'))
    );
    expect(toggle().checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.cloud.retry') }));
    await waitFor(() => expect(api.businessApi.data).toHaveBeenCalledTimes(2));
  });
});

describe('Deleting the current data with the copy on', () => {
  it('deletes the account copy too, without sending the empty form', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    localStorage.setItem(PREVIOUS_KEY, JSON.stringify({ data: form(), at: NOW }));
    const { api } = await setup({ manual: withIncome('100'), cloud: { on: true } });
    await waitFor(() => expect(api.businessApi.saveData).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.wipe') }));
    expect(confirm).toHaveBeenCalledWith(tr('app.autonomo.wipeConfirmCloud'));
    await waitFor(() => expect(api.businessApi.deleteData).toHaveBeenCalled());
    expect(localStorage.getItem(PREVIOUS_KEY)).toBeNull();
    await wait(5000);
    expect(api.businessApi.saveData).toHaveBeenCalledTimes(1);
    expect(stored()).toMatchObject({ version: null, pendingDelete: false });
  });

  it('deletes it once back online when the connection is down', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const { api } = await setup({ manual: withIncome('100'), cloud: { on: true } });
    await waitFor(() => expect(api.businessApi.saveData).toHaveBeenCalledTimes(1));
    api.businessApi.deleteData.mockRejectedValueOnce(networkError());
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.wipe') }));
    await waitFor(() => expect(sync()).toHaveTextContent(tr('app.autonomo.cloud.status.offline')));
    expect(stored()).toMatchObject({ pendingDelete: true });
    // The account still has the old copy; it must not come back into the empty form.
    api.businessApi.data.mockResolvedValue(null);
    fireEvent(window, new Event('online'));
    await waitFor(() => expect(api.businessApi.deleteData).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(stored()).toMatchObject({ pendingDelete: false }));
    expect(income().value).toBe('');
  });

  it('says so when the delete fails for another reason', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const { api } = await setup({ manual: withIncome('100'), cloud: { on: true } });
    await waitFor(() => expect(api.businessApi.saveData).toHaveBeenCalledTimes(1));
    api.businessApi.deleteData.mockRejectedValueOnce(new ApiError('Boom', 500, 'INTERNAL_ERROR'));
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.wipe') }));
    await waitFor(() => expect(sync()).toHaveTextContent(tr('app.autonomo.cloud.status.error')));
  });

  it('only forgets the kept copy when the account copy is off', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    localStorage.setItem(PREVIOUS_KEY, JSON.stringify({ data: form(), at: NOW }));
    const { api } = await setup({ manual: withIncome('100') });
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.wipe') }));
    expect(localStorage.getItem(PREVIOUS_KEY)).toBeNull();
    expect(api.businessApi.deleteData).not.toHaveBeenCalled();
  });
});
