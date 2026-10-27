import { useState } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { ActivityPanel } from '@modules/finances/ui/components/AutonomoActivity';
import { ModulesResult } from '@modules/finances/ui/components/AutonomoModules';
import {
  activityOf,
  emptyActivity,
  emptyObjective,
  inModules,
  newAsset,
  objectiveOf,
  toActivityInputs,
  type ActivityForm,
  type ObjectiveForm,
} from '@modules/finances/ui/components/activityForm';
import {
  NO_EXTRAS,
  emptyManual,
  type Extras,
  type ManualForm,
} from '@modules/finances/ui/components/AutonomoManual';
import { modulesView, smallOptionsOf } from '@modules/finances/ui/components/modulesView';
import { NO_VAT_EXTRAS } from '@modules/finances/ui/components/vatForm';
import { vatModules2025 } from '@modules/finances/domain/vatModules2025';
import { renderWithProviders, tr } from '@test-utils/render';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { BusinessView } from '@modules/finances/ui/views/BusinessView';
import { toManualData } from '@modules/finances/ui/components/AutonomoManual';
import { vatDeductible } from '@modules/finances/domain/importChecks';
import { AUTONOMO_WIZARD_KEY } from '@modules/finances/domain/autonomoWizard';
import { NEW_PROGRESS } from '@modules/wizard/domain/wizard';
import { YEARS } from '@modules/finances/ui/components/useAutonomoDraft';
import { freezeTime, restoreTime } from '@test-utils/time';

jest.mock('@modules/finances/ui/components/AutonomoWizard', () =>
  jest.requireActual('@test-utils/expertScreens').autonomoWithForm()
);

/**
 * The screen of an activity in módulos (invented data). The taxi of objectiveModules.test.ts:
 * 0.5 salaried, the owner, 45 thousand km, index 0.90: net income for the 131 8,799.08, 3 % =
 * 263.97 each quarter; VAT (vatSimplified.test.ts): C = 1,750.29, ingreso a cuenta 5 % = 87.51.
 */
const m = (key: string, values?: Record<string, string | number>) =>
  tr(`app.autonomo.modules.${key}`, values);
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const irpf = (module: string, when: 'atStart' | 'average') =>
  `${m('irpfUnits')} · ${module} · ${m(when)}`;

let current: ActivityForm = emptyActivity();
function Harness({ simplifiedVat = false }: { simplifiedVat?: boolean }) {
  const [value, setValue] = useState<ActivityForm | undefined>(undefined);
  current = activityOf(value);
  return (
    <ActivityPanel
      value={value}
      year={2026}
      reagp={false}
      simplifiedVat={simplifiedVat}
      onChange={setValue}
    />
  );
}

const taxiForm = (more: Partial<ObjectiveForm> = {}): ObjectiveForm => ({
  ...emptyObjective(),
  activityId: 'm59',
  unitsStart: ['0,5', '1', '45'],
  staffLastYear: '0,5',
  special: 'upTo100000',
  ...more,
});
const manualOf = (objective: ObjectiveForm, more: Partial<ActivityForm> = {}): ManualForm => ({
  ...emptyManual(),
  activity: { ...emptyActivity(), method: 'objective', objective, ...more },
});
const simplified: Extras = { ...NO_EXTRAS, vat: { ...NO_VAT_EXTRAS, regime: 'simplified' } };

describe('the activity in módulos on screen', () => {
  it('finds the activity by name or heading and takes its units and indices', () => {
    renderWithProviders(<Harness />);
    type(tr('app.autonomo.activity.methodLabel'), 'objective');
    expect(screen.getByText(m('title'))).toBeInTheDocument();
    // 70 activities of the order; «taxi» finds one, a word that is nowhere finds none.
    expect(screen.getByText(m('found', { n: 70, total: 70 }))).toBeInTheDocument();
    type(m('search'), 'zzz');
    expect(screen.getByText(m('found', { n: 0, total: 70 }))).toBeInTheDocument();
    type(m('search'), 'autotaxis');
    expect(screen.getByText(m('found', { n: 1, total: 70 }))).toBeInTheDocument();
    type(m('activity'), 'm59');
    expect(current.objective.activityId).toBe('m59');
    // The chosen one stays in the list though the search no longer finds it.
    type(m('search'), '721.1');
    expect(within(screen.getByLabelText(m('activity'))).getByText(/721\.2/)).toBeInTheDocument();
    type(irpf('Personal asalariado', 'atStart'), '0,5');
    type(irpf('Personal no asalariado', 'atStart'), '1');
    type(irpf('Distancia recorrida', 'atStart'), '45');
    type(irpf('Distancia recorrida', 'average'), '48');
    type(m('staffLastYear'), '0,5');
    type(m('special.taxi'), 'upTo100000');
    type(m('newYear'), '2');
    type(m('extraordinary'), '100');
    type(m('otherIncome'), '200');
    fireEvent.click(screen.getByLabelText(m('disabled')));
    fireEvent.click(screen.getByLabelText(m('ceutaMelilla')));
    fireEvent.click(screen.getByLabelText(m('noData')));
    type(m('startDate'), '2026-02-15');
    type(m('endDate'), '2026-11-30');
    type(m('seasonDays'), '90');
    type(m('seasonLastYear'), '120');
    type(`${m('seasonQuarter')} · ${tr('app.autonomo.quarterN', { n: 3 })}`, '60');
    type(`${m('paid')} · ${tr('app.autonomo.quarterN', { n: 1 })}`, '263,97');
    // A taxi has no small-business index (2.3, incompatibilities).
    expect(screen.queryByLabelText(m('small'))).toBeNull();
    expect(objectiveOf(current.objective)).toEqual({
      activityId: 'm59',
      unitsStart: [0.5, 1, 45],
      unitsYear: [null, null, 48],
      staffLastYear: 0.5,
      specialIndex: 0.9,
      smallIndex: 1,
      seasonDays: 90,
      seasonLastYear: 120,
      seasonQuarters: [0, 0, 60, 0],
      newYear: 2,
      disabled: true,
      startDate: '2026-02-15',
      endDate: '2026-11-30',
      noData: true,
      extraordinary: 100,
      otherIncome: 200,
      ceutaMelilla: true,
    });
    expect(toActivityInputs(current).paid130[0]).toBe(263.97);
    expect(inModules({ activity: current })).toBe(true);
    // Another activity starts with empty units.
    type(m('activity'), 'm01');
    expect(current.objective.unitsStart).toEqual([]);
    expect(screen.queryByLabelText(m('special.taxi'))).toBeNull();
  });

  it('offers the small-business index where it can apply, and the kiosks their own', () => {
    renderWithProviders(<Harness />);
    type(tr('app.autonomo.activity.methodLabel'), 'objective');
    type(m('activity'), 'm33');
    type(m('special.kiosk'), 'over100k');
    type(m('small'), 'over5000');
    expect(objectiveOf(current.objective)).toMatchObject({ specialIndex: 0.95, smallIndex: 0.8 });
    type(m('newYear'), '1');
    expect(objectiveOf(current.objective).newYear).toBe(1);
    // Its modules have salaried staff: last year's is asked.
    expect(screen.getByLabelText(m('staffLastYear'))).toBeInTheDocument();
    expect(smallOptionsOf('m60')).toEqual([]);
    expect(smallOptionsOf('m33')).toHaveLength(4);
  });

  it('asks the modules of the VAT in the simplified regime, derived from the IRPF ones', () => {
    renderWithProviders(<Harness simplifiedVat />);
    type(tr('app.autonomo.activity.methodLabel'), 'objective');
    type(m('activity'), 'm59');
    type(irpf('Personal asalariado', 'atStart'), '0,5');
    type(irpf('Personal no asalariado', 'atStart'), '1');
    type(irpf('Distancia recorrida', 'atStart'), '45');
    expect(screen.getByText(m('vatDerived', { units: '1,5 · 45' }))).toBeInTheDocument();
    type(`${m('vatUnits')} · Personal empleado · ${m('atStart')}`, '2');
    type(`${m('vatUnits')} · Distancia recorrida · ${m('average')}`, '50');
    type(m('vatSupported'), '900');
    type(m('vatCompensations'), '10');
    type(m('vatReduction'), '5');
    type(m('vatRefundsAbroad'), '1');
    expect(current.objective).toMatchObject({
      vatStart: ['2', ''],
      vatYear: ['', '50'],
      vatSupported: '900',
      vatCompensations: '10',
      vatReduction: '5',
      vatRefundsAbroad: '1',
    });
    // «None»: the activity is in the equivalence surcharge.
    type(m('vatActivity'), '');
    type(m('activity'), 'm05');
    expect(screen.getByText(m('vatRecargo'))).toBeInTheDocument();
    expect(screen.getByLabelText(m('vatActivity'))).toHaveValue('');
  });

  it('takes the units with what an older copy lacks', () => {
    const old = { method: 'objective', objective: { activityId: 'm59' } } as never;
    expect(activityOf(old).objective).toEqual({ ...emptyObjective(), activityId: 'm59' });
    const short = { objective: { seasonQuarters: ['5'] } } as never;
    expect(activityOf(short).objective.seasonQuarters).toEqual(['5', '', '', '']);
    expect(toActivityInputs({ ...emptyActivity(), method: 'objective' }).objective).toBeNull();
    expect(objectiveOf({ ...emptyObjective(), newYear: '', startDate: '1-2' })).toMatchObject({
      newYear: 0,
      startDate: null,
    });
  });
});

describe('the 131 and the 303 of the simplified regime on screen', () => {
  it('shows the 131 of the quarter, its preview and its file, and the 303 with its parts', () => {
    renderWithProviders(
      <ModulesResult manual={manualOf(taxiForm())} extras={simplified} year={2026} quarter={1} />
    );
    expect(screen.getByText(m('resultTitle', { n: 1, year: 2026 }))).toBeInTheDocument();
    const boxes = screen.getByText(m('boxes131')).closest('div') as HTMLElement;
    const row = (box: string) => within(boxes).getByText(box).closest('tr') as HTMLElement;
    expect(row('01')).toHaveTextContent('8.799,08');
    expect(row('02')).toHaveTextContent('263,97');
    // Last year's net income not typed: no reduction of box 09.
    expect(row('09')).toHaveTextContent('0,00');
    expect(row('15')).toHaveTextContent('263,97');
    expect(screen.getByText(m('result131.pay', { amount: '263,97 €' }))).toBeInTheDocument();
    const vat = screen
      .getByText(m('boxes303', { activity: '721.2 · Transporte por autotaxis' }))
      .closest('div') as HTMLElement;
    expect(within(vat).getByText('47').closest('tr')).toHaveTextContent('87,51');
    expect(within(vat).queryByText('65')).toBeNull();
    expect(screen.getByText(m('part.C'))).toBeInTheDocument();
    expect(screen.getByText(tr('aeatFiles.model.131'))).toBeInTheDocument();
    expect(screen.getByText(tr('aeatFiles.model.303'))).toBeInTheDocument();
  });

  it('says when a quarter is negative, when there is no data, no VAT modules or no activity', () => {
    const withheld = {
      ...manualOf(taxiForm()),
      quarters: emptyManual().quarters.map((q, i) => ({
        ...q,
        withheld: i === 0 ? '400' : '',
      })) as ManualForm['quarters'],
    };
    const { unmount } = renderWithProviders(
      <ModulesResult manual={withheld} extras={NO_EXTRAS} year={2026} quarter={1} />
    );
    expect(screen.getByText(m('result131.deduct', { amount: '136,03 €' }))).toBeInTheDocument();
    expect(screen.queryByText(tr('aeatFiles.model.303'))).toBeNull();
    unmount();
    const shop = manualOf({
      ...taxiForm(),
      activityId: 'm05',
      unitsStart: ['', '1'],
      noData: true,
    });
    const other = renderWithProviders(
      <ModulesResult manual={shop} extras={simplified} year={2027} quarter={1} />
    );
    expect(screen.getByText(m('noDataNote'))).toBeInTheDocument();
    expect(screen.getByText(m('provisional', { year: 2027 }))).toBeInTheDocument();
    expect(screen.getByText(m('vatRecargo'))).toBeInTheDocument();
    expect(screen.getByText(m('result131.zero'))).toBeInTheDocument();
    other.unmount();
    renderWithProviders(
      <ModulesResult manual={emptyManual()} extras={NO_EXTRAS} year={2026} quarter={1} />
    );
    expect(screen.getByText(m('missing'))).toBeInTheDocument();
  });

  it('notes the commissions of a bar in the simplified regime', () => {
    const bar = manualOf({
      ...taxiForm(),
      activityId: 'm45',
      unitsStart: ['3', '1', '35', '8', '10', '0', '1'],
    });
    renderWithProviders(<ModulesResult manual={bar} extras={simplified} year={2026} quarter={4} />);
    expect(screen.getByText(m('commissions'))).toBeInTheDocument();
    expect(screen.getByText(m('part.M'))).toBeInTheDocument();
  });
});

describe('what the screen of módulos works out', () => {
  it('fills the data of the files: marks, indices, days and the VAT of the expenses', () => {
    const shoes = manualOf({
      ...taxiForm(),
      activityId: 'm54',
      unitsStart: ['0', '1', '10', '10'],
      special: '',
      small: 'over5000',
      startDate: '2026-02-15',
    });
    const view = modulesView(shoes, simplified, 2026, 1)!;
    expect(view.file131).toMatchObject({ epigrafe: '691.9', aux: '1', quarterDays: 45 });
    expect(view.file131.indices).toEqual([1, 0.8, 1, 1, 1]);
    expect(view.vat !== 'none' && view.vat?.file).toMatchObject({ epigrafe: '691.9', aux: '1' });
    // A season activity: its days in the quarter.
    const season = modulesView(
      manualOf({ ...taxiForm(), seasonLastYear: '100', seasonQuarters: ['', '40', '', ''] }),
      NO_EXTRAS,
      2026,
      2
    )!;
    expect(season.file131.quarterDays).toBe(40);
    expect(season.file131.indices[2]).toBe(1.35);
    // New activity, disabled owner; and a big bakery over its excess amount.
    const fresh = modulesView(
      manualOf({ ...taxiForm(), newYear: '2', disabled: true }),
      NO_EXTRAS,
      2026,
      1
    )!;
    expect(fresh.file131.indices[4]).toBe(0.7);
    const first = modulesView(
      manualOf({ ...taxiForm(), newYear: '1' }),
      {
        ...NO_EXTRAS,
        priorNet: '9500',
      },
      2026,
      1
    )!;
    expect(first.file131).toMatchObject({ lastYearNet: 9500 });
    expect(first.file131.indices[4]).toBe(0.8);
    // 9,500 € last year: 75 € less in box 09.
    expect(first.result131.boxes.find((b) => b.box === '09')!.amount).toBe(75);
    const bakery = modulesView(
      manualOf({ ...taxiForm(), activityId: 'm01', unitsStart: ['5', '1', '200', '50'] }),
      NO_EXTRAS,
      2026,
      1
    )!;
    expect(bakery.file131.indices[3]).toBe(1.3);
    // Freight: the 722 of goods carries «1»; waste «2».
    const freight = modulesView(
      manualOf({ ...taxiForm(), activityId: 'm60', unitsStart: ['0', '1', '20'] }),
      simplified,
      2026,
      1
    )!;
    expect(freight.vat !== 'none' && freight.vat?.file.aux).toBe('1');
    const waste = modulesView(
      manualOf({
        ...taxiForm(),
        activityId: 'm60',
        unitsStart: ['0', '1', '20'],
        vatActivity: vatModules2025.find(
          (v) => /residuos/.test(v.activity) && !/excepto/.test(v.activity)
        )!.id,
      }),
      simplified,
      2026,
      1
    )!;
    expect(waste.vat !== 'none' && waste.vat?.activity.activity).toMatch(/residuos/);
    expect(waste.vat !== 'none' && waste.vat?.file.aux).toBe('2');
    // The VAT of the expenses typed: current ones for the year, investments to box 55.
    const expenses = {
      ...manualOf(taxiForm()),
      quarters: emptyManual().quarters.map((q, i) => ({
        ...q,
        expenses:
          i === 0
            ? [
                { kind: 'vehicle', amount: '121', vatRate: 21, days: '' },
                { kind: 'vehicle', amount: '24200', vatRate: 21, days: '', investment: true },
              ]
            : [],
      })) as ManualForm['quarters'],
    };
    expenses.profile = { ...expenses.profile, vehicleExclusive: true };
    const v = modulesView(expenses, simplified, 2026, 1)!;
    expect(v.vat !== 'none' && v.vat?.supported).toBe(21);
    expect(v.vat !== 'none' && v.vat?.result.boxes.find((b) => b.box === '55')?.amount).toBe(4200);
    expect(
      modulesView(manualOf({ ...taxiForm(), activityId: 'zz' }), NO_EXTRAS, 2026, 1)
    ).toBeNull();
    expect(modulesView(manualOf(taxiForm()), NO_EXTRAS, 2024, 1)).toBeNull();
    // Typed units of the VAT win; text that is not a number counts as nothing.
    const typed = modulesView(
      manualOf({ ...taxiForm(), vatStart: ['2', ''], vatSupported: '' }),
      simplified,
      2026,
      1
    )!;
    expect(typed.vat !== 'none' && typed.vat?.unitsStart).toEqual([2, 45]);
    // The car in use at 1 January, at the maximum rate (25 % of 20,000): 5,000 of incentives;
    // one bought this year does not count for the 131.
    const car = { ...newAsset(2025), group: 'm3', cost: '20000', start: '2025-01-01' };
    const later = { ...newAsset(2026), group: 'm3', cost: '20000', start: '2026-06-01' };
    const withCar = modulesView(
      manualOf(taxiForm(), { assets: [car, later] }),
      NO_EXTRAS,
      2026,
      1
    )!;
    expect(withCar.file131.investment).toBe(5000);
  });
});

describe('módulos in the self-employed screen', () => {
  const store = (manual: ManualForm) =>
    localStorage.setItem('mm_autonomo_manual2', JSON.stringify(manual));
  const open = (onOpenTab?: jest.Mock) => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
    return renderWithProviders(<BusinessView onOpenTab={onOpenTab} />, { api, plan: true });
  };
  beforeEach(() => localStorage.clear());

  it('asks in step 1 how the income is worked out and, in modules, the activity', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: `${tr('wizard.next')} →` }));
    fireEvent.click(
      screen.getByRole('radio', { name: tr('wizard.autonomo.opt.method.objective') })
    );
    type(m('activity'), 'm59');
    type(irpf('Personal no asalariado', 'atStart'), '1');
    type(`${m('paid')} · ${tr('app.autonomo.quarterN', { n: 1 })}`, '100');
    const saved = JSON.parse(localStorage.getItem('mm_autonomo_manual2') as string);
    expect(saved.activity).toMatchObject({
      method: 'objective',
      agrarian: false,
      paid130: ['100', '', '', ''],
      objective: { activityId: 'm59', unitsStart: ['', '1', ''] },
    });
    // In modules there is no question about the 130 exemption nor the 5 %.
    fireEvent.click(screen.getByRole('button', { name: `${tr('wizard.next')} →` }));
    expect(screen.getByText(tr('wizard.autonomo.q.regime'))).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('radio', { name: tr('wizard.autonomo.opt.regime.simplified') })
    );
    fireEvent.click(screen.getByRole('button', { name: `${tr('wizard.next')} →` }));
    expect(screen.queryByText(tr('wizard.autonomo.q.retained'))).toBeNull();
    expect(screen.queryByText(tr('wizard.autonomo.q.simplified'))).toBeNull();
  });

  it('prepares the 131 in the assistant and in the screen with everything together', () => {
    // The screen opens on this year (no invoices) and, in October, on the 4th quarter.
    const year = YEARS[1];
    freezeTime(`${year + 1}-01-19T12:00:00`);
    store(manualOf(taxiForm()));
    localStorage.setItem(
      AUTONOMO_WIZARD_KEY,
      JSON.stringify({
        ...NEW_PROGRESS,
        at: 3,
        screen: 4,
        done: ['activity', 'import', 'review'],
      })
    );
    const { unmount } = open();
    expect(screen.getAllByText(m('resultTitle', { n: 4, year })).length).toBeGreaterThan(0);
    unmount();
    localStorage.setItem('mm_autonomo_assistant', 'expert');
    open(jest.fn());
    expect(screen.getByText(m('resultTitle', { n: 4, year }))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: tr('app.autonomo.prepare') })).toBeNull();
    restoreTime();
  });
});

describe('the VAT that can be deducted of an expense', () => {
  const profile = toManualData(emptyManual()).profile;
  it('takes the share of each kind, and nothing of an expense without Spanish VAT', () => {
    expect(vatDeductible({ kind: 'material', amount: 121, vatRate: 21 }, profile)).toBe(21);
    expect(vatDeductible({ kind: 'clients', amount: 121, vatRate: 21 }, profile)).toBe(0);
    expect(
      vatDeductible({ kind: 'material', amount: 100, vatRate: 21, op: 'intraGoods' }, profile)
    ).toBe(0);
  });
});
