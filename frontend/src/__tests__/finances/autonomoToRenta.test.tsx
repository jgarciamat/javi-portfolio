import { useState } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { BusinessView } from '@modules/finances/ui/views/BusinessView';
import { RentaView } from '@modules/finances/ui/views/RentaView';
import { emptyManual, type ManualForm } from '@modules/finances/ui/components/AutonomoManual';
import { emptyActivity, emptyObjective } from '@modules/finances/ui/components/activityForm';
import {
  autonomoOnDevice,
  invoiceYears,
  openingPeriod,
  preferredYear,
  yearCheck,
} from '@modules/finances/ui/components/autonomoForRenta';
import { AUTONOMO_ASSISTANT_KEY } from '@modules/finances/domain/autonomoWizard';
import type { ImportedInvoice } from '@modules/finances/domain/invoiceLedger';
import { loadProgress } from '@modules/tools/application/rentaProgress';
import { wizardKey } from '@modules/tools/ui/renta/RentaWizard';
import type { DashboardTab } from '@modules/finances/ui/navigation';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

/**
 * From the self-employed screen to the Renta of the same year, end to end (invented data).
 * Hand calculation of the year: four quarters of 5,000 € of income at 21 % and 1,000 € of material
 * (1,210 € with its VAT),
 * with 750 € withheld each: income (0180) 20,000; expenses (0218) 4,000; no 5 % (option off);
 * 5 % of the simplified modality (0222) 800; net (0224) 15,200; withholdings (0599) 3,000. The 130 not typed is estimated quarter by quarter:
 * 20 % of the cumulative net less what was withheld and paid before = 50 € each, 200 € (0604).
 */
const invoice = (year: number, n: number): ImportedInvoice => ({
  id: `e-${year}-${n}`,
  book: 'issued',
  kind: 'other',
  excluded: false,
  date: `${year}-0${n}-15`,
  quarter: 1,
  base: 5000,
  vatRate: 21,
  vat: 1050,
  total: 6050,
  withheld: 750,
  concept: 'Cliente Ficticio, S.L.',
});
const manualOf = (year: number): ManualForm => ({
  ...emptyManual(),
  quarters: emptyManual().quarters.map(() => ({
    income: { r21: '5000', r10: '', r4: '', r0: '' },
    withheld: '750',
    expenses: [{ kind: 'material', amount: '1210', vatRate: 21, days: '' }],
  })) as ManualForm['quarters'],
  invoices: [invoice(year, 1), invoice(year, 2)],
});
const store = (year: number) =>
  localStorage.setItem('mm_autonomo_manual2', JSON.stringify(manualOf(year)));

/** The app with its two sections: the self-employed screen opens the Renta, and back. */
function App({ start }: { start: DashboardTab }) {
  const [tab, setTab] = useState<DashboardTab>(start);
  return tab === 'renta' ? <RentaView onOpenTab={setTab} /> : <BusinessView onOpenTab={setTab} />;
}
const open = (start: DashboardTab = 'business') => {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
  return renderWithProviders(<App start={start} />, { api, plan: true });
};

/** The Renta assistant left at a step, with the ones before it done. */
const rentaAt = (year: number, step: number) =>
  localStorage.setItem(
    wizardKey(year),
    JSON.stringify({
      at: step,
      screen: 0,
      done: ['you', 'family', 'work', 'home', 'invest'].slice(0, step),
      answers: {},
      streak: 1,
      lastDay: '2026-01-01',
    })
  );
const button = (name: string) => screen.getByRole('button', { name });
const boxRow = (box: string) =>
  screen
    .getAllByText(box)
    .map((el) => el.closest('li') as HTMLElement)
    .find((li) => li !== null) as HTMLElement;

beforeEach(() => {
  localStorage.clear();
  // Everything together on the self-employed screen; the Renta step by step.
  localStorage.setItem(AUTONOMO_ASSISTANT_KEY, 'expert');
});
afterEach(restoreTime);

describe('which year the self-employed data is of', () => {
  it('reads it from the dates of the invoices', () => {
    const manual = { invoices: [invoice(2026, 1), invoice(2025, 1), invoice(2026, 2)] };
    expect(invoiceYears(manual)).toEqual([2026, 2025]);
    // A tie goes to the latest year; an invoice without a date counts for none.
    expect(invoiceYears({ invoices: [invoice(2024, 1), invoice(2025, 1)] })).toEqual([2025, 2024]);
    expect(invoiceYears({ invoices: [{ ...invoice(2025, 1), date: '' }] })).toEqual([]);
    expect(preferredYear(manual, [2025, 2026, 2027], 2027)).toBe(2026);
    expect(preferredYear(manual, [2027], 2027)).toBe(2027);
    expect(yearCheck(manual, 2025)).toEqual({ matches: true, years: [2026, 2025] });
    expect(yearCheck({ invoices: [] }, 2025)).toEqual({ matches: true, years: [] });
    expect(yearCheck(manual, 2024).matches).toBe(false);
  });

  it('opens on the quarter to file, or on the last quarter with invoices of their year', () => {
    const years = [2025, 2026, 2027];
    const oct = new Date(2026, 9, 9);
    // No invoices: the quarter to file (the 3T in October; the 4T of last year in February).
    expect(openingPeriod({ invoices: [] }, years, oct)).toEqual({ year: 2026, quarter: 3 });
    expect(openingPeriod({ invoices: [] }, years, new Date(2026, 1, 3))).toEqual({
      year: 2025,
      quarter: 4,
    });
    // Invoices of the year to file: still its quarter to file, even with invoices of a later one.
    const now = { invoices: [invoice(2026, 1), { ...invoice(2026, 1), date: '2026-11-02' }] };
    expect(openingPeriod(now, years, oct)).toEqual({ year: 2026, quarter: 3 });
    // Invoices of another year: that year and its last quarter with invoices (the 4T without one).
    const past = { invoices: [invoice(2025, 1), invoice(2025, 5)] };
    expect(openingPeriod(past, years, oct)).toEqual({ year: 2025, quarter: 2 });
    const odd = { invoices: [{ ...invoice(2025, 1), date: '2025-00-01' }] };
    expect(openingPeriod(odd, years, oct)).toEqual({ year: 2025, quarter: 4 });
    expect(openingPeriod({ invoices: [invoice(2026, 2)] }, years, new Date(2026, 0, 20))).toEqual({
      year: 2026,
      quarter: 1,
    });
  });

  it('gives the year of the device for the Renta, or nothing when nothing was typed', () => {
    expect(autonomoOnDevice(2026).annual).toBeNull();
    store(2026);
    const device = autonomoOnDevice(2026);
    expect(device.matches).toBe(true);
    expect(device.annual).toMatchObject({ year: 2026, net: 15200, withholdings: 3000 });
    expect(device.annual?.payments130.total).toBe(200);
    expect(autonomoOnDevice(2025).matches).toBe(false);
  });
});

describe('Autónomos 2026 → Renta 2026, in one tap', () => {
  it('takes the year to the Renta of the same year and shows it box by box', async () => {
    freezeTime('2026-10-19T12:00:00');
    store(2026);
    rentaAt(2026, 2);
    open();
    fireEvent.click(button(tr('tools.renta.prepare.button', { year: 2026 })));
    fireEvent.click(button(tr('tools.renta.prepare.take', { year: 2026 })));

    // The Renta opens on 2026, says it is provisional and what it brought.
    const year = await screen.findByLabelText(tr('app.renta.year'));
    expect(year).toHaveValue('2026');
    expect(screen.getByText(tr('app.renta.provisional', { year: 2026 }))).toBeVisible();
    const brought = screen.getByText(tr('app.renta.brought', { year: 2026 })).parentElement!;
    expect(
      within(brought).getByText(tr('tools.renta.bring.fig.net')).closest('li')
    ).toHaveTextContent('15.200,00');
    expect(loadProgress()).toMatchObject({ year: 2026 });
    expect(loadProgress()?.form.activities?.[0]).toMatchObject({ withheld: 3000, payments: 200 });

    // Step 3 knows there is no pay: «only my activity», no amounts nor warning, no payers.
    expect(
      screen.getByRole('radio', { name: tr('tools.renta.guide.opt.income.self') })
    ).toBeChecked();
    expect(screen.getByText(tr('tools.renta.guide.selfBrought'))).toBeVisible();
    expect(screen.queryByLabelText(tr('tools.renta.gross'))).toBeNull();
    expect(screen.queryByText(tr('wizard.renta.warn.gross'))).toBeNull();
    fireEvent.click(button(tr('wizard.finishStep', { n: 3 })));
    expect(screen.queryByText(tr('wizard.renta.q.payers'))).toBeNull();
  });

  it('shows the activity in step 6 with every box to copy', async () => {
    freezeTime('2026-10-19T12:00:00');
    store(2026);
    rentaAt(2026, 5);
    open('renta');
    // With nothing brought yet the Renta opens on the last campaign: the person picks 2026.
    fireEvent.change(await screen.findByLabelText(tr('app.renta.year')), {
      target: { value: '2026' },
    });
    fireEvent.click(
      await screen.findByRole('radio', { name: tr('wizard.renta.opt.activity.yes') })
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: tr('tools.renta.bring.button', { year: 2026 }),
      })
    );
    expect(screen.getByText(tr('tools.renta.bring.done', { year: 2026 }))).toBeVisible();
    const boxes: [string, string][] = [
      ['0180', '20.000,00'],
      ['0218', '4000,00'],
      ['0222', '800,00'],
      ['0224', '15.200,00'],
      ['0231', '15.200,00'],
      ['0235', '15.200,00'],
      ['0599', '3000,00'],
      ['0604', '200,00'],
    ];
    for (const [box, amount] of boxes) expect(boxRow(box)).toHaveTextContent(amount);
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    fireEvent.click(button(tr('tools.renta.activities.copyBox', { box: '0224' })));
    expect(writeText).toHaveBeenCalledWith('15200,00');
    expect(await screen.findByText(tr('tools.renta.activities.copied'))).toBeVisible();
  });
});

describe('Autónomos 2025 → Renta 2025', () => {
  it('opens the self-employed screen on the year of the invoices and takes it to the Renta 2025', async () => {
    freezeTime('2026-03-15T12:00:00');
    store(2025);
    open();
    // The invoices are of 2025: the self-employed screen opens on 2025, fourth quarter.
    fireEvent.click(button(tr('tools.renta.prepare.button', { year: 2025 })));
    fireEvent.click(button(tr('tools.renta.prepare.take', { year: 2025 })));
    expect(await screen.findByLabelText(tr('app.renta.year'))).toHaveValue('2025');
    expect(screen.queryByText(tr('app.renta.provisional', { year: 2025 }))).toBeNull();
    expect(screen.getByText(tr('app.renta.brought', { year: 2025 }))).toBeVisible();
    expect(loadProgress()).toMatchObject({ year: 2025 });
  });

  it('in the Renta 2025 with data of 2026: says so and changes the year', async () => {
    freezeTime('2026-03-15T12:00:00');
    store(2026);
    rentaAt(2025, 5);
    rentaAt(2026, 5);
    open('renta');
    fireEvent.click(
      await screen.findByRole('radio', { name: tr('wizard.renta.opt.activity.yes') })
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: tr('tools.renta.bring.button', { year: 2025 }),
      })
    );
    expect(
      screen.getByText(tr('tools.renta.bring.otherYear', { year: 2025, years: '2026' }))
    ).toBeVisible();
    fireEvent.click(button(tr('tools.renta.bring.switch', { year: 2026 })));
    expect(screen.getByLabelText(tr('app.renta.year'))).toHaveValue('2026');
    fireEvent.click(
      await screen.findByRole('radio', { name: tr('wizard.renta.opt.activity.yes') })
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: tr('tools.renta.bring.button', { year: 2026 }),
      })
    );
    expect(screen.getByText(tr('tools.renta.bring.done', { year: 2026 }))).toBeVisible();
  });
});

describe('the activity brought, without contradictory figures, and taken out again', () => {
  it('says where each figure comes from, apart from the movements of the accounts', async () => {
    freezeTime('2026-10-19T12:00:00');
    store(2026);
    rentaAt(2026, 5);
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
    // The movements of the accounts of 2026: another source, said as such.
    api.transactionApi.getAnnual.mockResolvedValue({
      year: 2026,
      months: { 1: { income: 3505, expenses: 1090, saving: 0, balance: 2415 } },
    });
    renderWithProviders(<App start="renta" />, { api, plan: true });
    fireEvent.change(await screen.findByLabelText(tr('app.renta.year')), {
      target: { value: '2026' },
    });
    expect(
      await screen.findByText(/en 2026 entraron .*3505,00.* y salieron .*1090,00/)
    ).toBeVisible();
    fireEvent.click(
      await screen.findByRole('button', { name: tr('tools.renta.bring.button', { year: 2026 }) })
    );
    // From Autónomos, said so; no RETA there; the payments of the 130 are the app's estimate.
    expect(
      screen.getAllByText(tr('tools.renta.bring.fig.source', { year: 2026 }))[0]
    ).toBeVisible();
    expect(screen.getAllByText(tr('tools.renta.bring.fig.noReta'))[0]).toBeVisible();
    expect(
      screen.getAllByText(
        `${tr('tools.renta.bring.fig.payments')} (${tr('tools.renta.bring.fig.estimated')})`
      )[0]
    ).toBeVisible();
    // The banner on top follows what the planner saves.
    expect(await screen.findByText(tr('app.renta.brought', { year: 2026 }))).toBeVisible();

    fireEvent.click(button(tr('tools.renta.removeActivity.button')));
    fireEvent.click(button(tr('tools.renta.removeActivity.confirm')));
    expect(loadProgress()?.form.activities).toEqual([]);
    expect(screen.queryByText(tr('app.renta.brought', { year: 2026 }))).toBeNull();
    expect(screen.queryByText(tr('tools.renta.bring.done', { year: 2026 }))).toBeNull();
    expect(screen.queryByText(tr('tools.renta.activities.boxes'))).toBeNull();
    // The data of Autónomos is still there: it can be brought again.
    expect(autonomoOnDevice(2026).annual?.net).toBe(15200);
    fireEvent.click(button(tr('tools.renta.bring.button', { year: 2026 })));
    expect(screen.getByText(tr('tools.renta.bring.done', { year: 2026 }))).toBeVisible();
  });
});

describe('a taxi in módulos → Renta 2026', () => {
  it('takes the net income of the modules and its 131 to the Renta, box by box', async () => {
    freezeTime('2026-10-19T12:00:00');
    // The invented taxi of objectiveModules.test.ts: net income 8,799.08; the 131 is estimated
    // at 3 % each quarter: 263.97 × 4 = 1,055.88 (no reduction of box 09 without last year's net).
    const taxi = {
      ...emptyManual(),
      invoices: [invoice(2026, 1)],
      activity: {
        ...emptyActivity(),
        method: 'objective',
        objective: {
          ...emptyObjective(),
          activityId: 'm59',
          unitsStart: ['0,5', '1', '45'],
          staffLastYear: '0,5',
          special: 'upTo100000',
        },
      },
    };
    localStorage.setItem('mm_autonomo_manual2', JSON.stringify(taxi));
    rentaAt(2026, 5);
    open();
    fireEvent.click(button(tr('tools.renta.prepare.button', { year: 2026 })));
    expect(
      screen.getByText(tr('tools.renta.bring.fig.payments131'), { exact: false })
    ).toBeVisible();
    fireEvent.click(button(tr('tools.renta.prepare.take', { year: 2026 })));
    await screen.findByLabelText(tr('app.renta.year'));
    expect(loadProgress()?.form.activities?.[0]).toMatchObject({
      kind: 'modules',
      payments: 1055.88,
    });
    for (const [box, amount] of [
      ['1465', '10.358,63'],
      ['1474', '9262,19'],
      ['1479', '8799,08'],
      ['1482', '8799,08'],
      // Art. 32.2.3.º: income between 8,000 and 12,000 €: 1,620 − 0.405 × 799.08 = 1,296.37.
      ['1483', '1296,37'],
      ['1484', '7502,71'],
      ['0604', '1055,88'],
    ])
      expect(boxRow(box)).toHaveTextContent(amount);
  });
});
