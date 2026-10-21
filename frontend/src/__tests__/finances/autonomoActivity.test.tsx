import { useState } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { annualActivity } from '@modules/finances/domain/annualActivity';
import {
  ActivityPanel,
  ActivitySummaryPanel,
} from '@modules/finances/ui/components/AutonomoActivity';
import {
  activityExtras,
  activityOf,
  emptyActivity,
  isEmptyActivity,
  newAsset,
  toActivityInputs,
  type ActivityForm,
} from '@modules/finances/ui/components/activityForm';
import { annualOf, buildInputs } from '@modules/finances/ui/components/autonomoInputs';
import { NO_EXTRAS, emptyManual } from '@modules/finances/ui/components/AutonomoManual';
import { toSaved } from '@modules/finances/ui/components/autonomoSync';
import { BusinessView } from '@modules/finances/ui/views/BusinessView';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

const k = (key: string, values?: Record<string, string | number>) =>
  tr(`app.autonomo.activity.${key}`, values);
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const q = (n: number) => tr('app.autonomo.quarterN', { n });

let current: ActivityForm = emptyActivity();
function Harness({ reagp = false, initial }: { reagp?: boolean; initial?: ActivityForm }) {
  const [value, setValue] = useState<ActivityForm | undefined>(initial);
  current = activityOf(value);
  return <ActivityPanel value={value} year={2026} reagp={reagp} onChange={setValue} />;
}

describe('The activity of the year on screen', () => {
  it('takes assets: kind, cost, land of a building, life of an intangible, method and VAT', () => {
    renderWithProviders(<Harness />);
    expect(screen.getByText(k('regimeHint.simplified'))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: `+ ${k('assets')}` }));
    type(`${k('asset.name')} 1`, 'Portátil');
    type(`${k('asset.cost')} 1`, '1500');
    type(`${k('asset.start')} 1`, '2026-04-01');
    type(`${k('asset.use')} 1`, '80');
    type(`${k('asset.method')} 1`, 'accelerated');
    type(`${k('asset.rate')} 1`, '20');
    type(`${k('asset.accumulated')} 1`, '0');
    type(`${k('asset.vat')} 1`, '315');
    type(`${k('asset.vatPct')} 1`, '100');
    fireEvent.click(screen.getByLabelText(`${k('asset.used')} 1`));
    expect(screen.queryByLabelText(`${k('asset.land')} 1`)).toBeNull();
    type(`${k('asset.group')} 1`, 's1');
    type(`${k('asset.land')} 1`, '30000');
    type(`${k('asset.group')} 1`, 'intangible');
    type(`${k('asset.life')} 1`, '4');
    expect(current.assets[0]).toMatchObject({
      name: 'Portátil',
      group: 'intangible',
      cost: '1500',
      land: '30000',
      start: '2026-04-01',
      method: 'accelerated',
      rate: '20',
      life: '4',
      used: true,
      accumulated: '0',
      vat: '315',
      vatPct: '100',
    });
    fireEvent.click(
      screen.getByRole('button', { name: `${tr('app.common.delete')} ${k('assets')} 1` })
    );
    expect(current.assets).toEqual([]);
  });

  it('takes grants, and the asset a capital one finances', () => {
    renderWithProviders(
      <Harness
        initial={{
          ...emptyActivity(),
          assets: [newAsset(2026), { ...newAsset(2026), name: 'Nave' }],
        }}
      />
    );
    type(`${k('asset.name')} 2`, 'Furgoneta');
    fireEvent.click(screen.getByRole('button', { name: `+ ${k('subsidies')}` }));
    type(`${k('subsidy.name')} 1`, 'Ayuda');
    type(`${k('subsidy.amount')} 1`, '6000');
    type(`${k('subsidy.year')} 1`, '2025');
    type(`${k('subsidy.quarter')} 1`, '3');
    expect(screen.queryByLabelText(`${k('subsidy.asset')} 1`)).toBeNull();
    type(`${k('subsidy.kind')} 1`, 'capital');
    const select = screen.getByLabelText(`${k('subsidy.asset')} 1`);
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent)
    ).toEqual([k('subsidy.noAsset'), '#1', 'Furgoneta']);
    type(`${k('subsidy.asset')} 1`, '1');
    expect(current.subsidies[0]).toEqual({
      name: 'Ayuda',
      kind: 'capital',
      amount: '6000',
      year: '2025',
      quarter: '3',
      asset: '1',
    });
  });

  it('asks for provisions in the normal modality, compensations in farming and what each 130 paid', () => {
    renderWithProviders(<Harness />);
    expect(screen.queryByLabelText(k('provisions'))).toBeNull();
    expect(screen.queryByText(k('compensations'))).toBeNull();
    type(k('methodLabel'), 'normal');
    type(k('provisions'), '500');
    type(k('retaFix'), '-120');
    type(k('selfConsumption'), '60');
    type(k('stockChange'), '-300');
    type(`${k('paid')} · ${q(2)}`, '150');
    fireEvent.click(screen.getByLabelText(k('agrarian')));
    expect(screen.getByText(k('agrarianHint'))).toBeTruthy();
    type(`${k('compensation')} · ${q(1)}`, '1200');
    expect(current).toMatchObject({
      method: 'normal',
      agrarian: true,
      provisions: '500',
      retaFix: '-120',
      selfConsumption: '60',
      stockChange: '-300',
      compensations: ['1200', '', '', ''],
      paid130: ['', '150', '', ''],
    });
  });

  it('shows the compensations with the REAGP of the VAT too', () => {
    renderWithProviders(<Harness reagp />);
    expect(screen.getByText(k('compensations'))).toBeTruthy();
  });

  it('takes the products, the CAP aid and the correctors of farming in modules', () => {
    renderWithProviders(
      <Harness initial={{ ...emptyActivity(), method: 'objective', agrarian: true }} />
    );
    expect(screen.getByText(k('assetsHintModules'))).toBeTruthy();
    expect(screen.queryByText(k('paid130'))).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: `+ ${k('assets')}` }));
    // In modules the intangibles are group 4 of the table.
    const groups = within(screen.getByLabelText(`${k('asset.group')} 1`)).getAllByRole('option');
    expect(groups.map((o) => (o as HTMLOptionElement).value)).not.toContain('intangible');
    fireEvent.click(screen.getByRole('button', { name: `+ ${k('modules.rows')}` }));
    type(`${k('modules.product')} 1`, 'olive');
    type(`${k('modules.income')} 1`, '30000');
    type(`${k('modules.reduced')} 1`, '0,2');
    fireEvent.click(screen.getByLabelText(`${k('modules.transformed')} 1`));
    type(k('modules.pacAid'), '5000');
    type(k('modules.staffShare'), '25');
    type(k('modules.rentedShare'), '50');
    type(k('modules.irrigatedShare'), '10');
    type(k('modules.refunds'), '100');
    type(k('modules.extraordinary'), '200');
    for (const flag of ['externalMeans', 'boughtFeed', 'organic', 'forestPlan', 'youngFarmer']) {
      fireEvent.click(screen.getByLabelText(k(`modules.${flag}`)));
    }
    expect(current.modules).toEqual({
      rows: [{ product: 'olive', income: '30000', transformed: true, reduced: '0,2' }],
      pacAid: '5000',
      staffShare: '25',
      rentedShare: '50',
      irrigatedShare: '10',
      externalMeans: true,
      boughtFeed: true,
      organic: true,
      forestPlan: true,
      youngFarmer: true,
      refunds: '100',
      extraordinary: '200',
    });
  });
});

describe('The annual summary on screen', () => {
  const base = buildInputs(emptyManual(), NO_EXTRAS, 2026, 4);

  it('shows the net yield, the boxes and the warnings', () => {
    const manual = emptyManual();
    manual.quarters[0].income.r21 = '10000';
    manual.quarters[0].withheld = '1500';
    renderWithProviders(<ActivitySummaryPanel annual={annualOf(manual, NO_EXTRAS, 2026)} />);
    expect(screen.getByText(k('summary', { year: 2026 }))).toBeTruthy();
    expect(screen.getByText('Ingresos de explotación')).toBeTruthy();
    expect(screen.getByText('Retenciones por rendimientos de actividades económicas')).toBeTruthy();
    expect(screen.getByText(k('warning.notWorkedOut'))).toBeTruthy();
  });

  it('says when the yield is not worked out, and gives no table without boxes', () => {
    const annual = annualActivity(2026, {
      ...base,
      activity: { ...toActivityInputs(null), method: 'objective' },
    });
    renderWithProviders(
      <ActivitySummaryPanel annual={{ ...annual, boxes: { ...annual.boxes, '9999': 1 } }} />
    );
    expect(screen.getByText(k('notCalculated'))).toBeTruthy();
    expect(screen.getAllByText('9999')).toHaveLength(2);
    expect(screen.getByText(k('warning.objective'))).toBeTruthy();
  });

  it('gives no table when every box is zero', () => {
    renderWithProviders(
      <ActivitySummaryPanel
        annual={annualActivity(2026, {
          ...base,
          activity: { ...toActivityInputs(null), method: 'objective' },
        })}
      />
    );
    expect(screen.queryByText(k('boxes'))).toBeNull();
  });
});

describe('The activity as the draft and the summary take it', () => {
  it('reads the typed text, older data and what is not a number', () => {
    const form: ActivityForm = {
      ...emptyActivity(),
      method: 'objective',
      agrarian: true,
      assets: [
        {
          ...newAsset(2026),
          cost: '1500,50',
          start: 'mal',
          use: '',
          rate: 'x',
          life: '5',
          used: true,
          accumulated: '10',
          vat: '',
          vatPct: '',
        },
        { ...newAsset(2026), rate: '8' },
      ],
      subsidies: [
        { name: 'A', kind: 'capital', amount: '100', year: '2026', quarter: '2', asset: '' },
        { name: 'B', kind: 'capital', amount: '100', year: '2026', quarter: '2', asset: '1' },
      ],
      retaFix: '-50',
      paid130: ['10', '', 'x', ''],
      modules: {
        ...emptyActivity().modules,
        rows: [{ product: 'cereals', income: '100', transformed: false, reduced: '' }],
      },
    };
    const inputs = toActivityInputs(form);
    expect(inputs.assets[0]).toEqual({
      name: '',
      group: 's2',
      cost: 1500.5,
      land: 0,
      start: '9999-12-31',
      use: 100,
      method: 'table',
      life: 5,
      used: true,
      accumulated: 10,
      vat: 0,
      vatPct: 100,
    });
    expect(inputs.assets[1].rate).toBe(8);
    expect(inputs.subsidies.map((s) => s.asset)).toEqual([null, 1]);
    expect([inputs.retaFix, inputs.paid130]).toEqual([-50, [10, null, null, null]]);
    expect(inputs.modules?.rows).toEqual([
      { product: 'cereals', income: 100, transformed: false, reduced: null },
    ]);
    expect(toActivityInputs({ ...form, method: 'normal' }).modules).toBeNull();
    // Older data: the missing parts take their empty value.
    const old = activityOf({
      method: 'normal',
      compensations: ['5'],
      paid130: ['7'],
      assets: [{ name: 'Mesa' } as never],
    });
    expect(old.compensations).toEqual(['5', '', '', '']);
    expect(old.paid130).toEqual(['7', '', '', '']);
    expect(old.assets[0]).toEqual({ ...newAsset(0), name: 'Mesa' });
    expect(isEmptyActivity(undefined)).toBe(true);
    expect(isEmptyActivity(old)).toBe(false);
  });

  it('adds the depreciation, the provisions and the grants to the quarters of the draft', () => {
    const manual = emptyManual();
    manual.activity = {
      ...emptyActivity(),
      method: 'normal',
      provisions: '400',
      compensations: ['', '50', '', ''],
      assets: [
        { ...newAsset(2026), group: 'computers', cost: '1200', start: '2026-01-01' },
        {
          ...newAsset(2026),
          group: 'computers',
          cost: '5000',
          start: '2024-01-01',
          vat: '1050',
          vatPct: '100',
        },
      ],
      subsidies: [
        { name: 'Ayuda', kind: 'current', amount: '300', year: '2026', quarter: '2', asset: '' },
        { name: 'Equipo', kind: 'capital', amount: '600', year: '2026', quarter: '1', asset: '0' },
      ],
    };
    const inputs = buildInputs(manual, { ...NO_EXTRAS, hardToJustify: true }, 2026, 4);
    // 1,200 × 25 % = 300 a year, 75 a quarter, and 5,000 × 25 % = 1,250 (312.50 a quarter);
    // the grant of 600 follows the first: 600 × 75 / 1,200 = 37.50 a quarter.
    expect(inputs.quarters.map((x) => x.depreciation)).toEqual([387.5, 387.5, 387.5, 387.5]);
    expect(inputs.quarters.map((x) => x.capitalSubsidies)).toEqual([37.5, 37.5, 37.5, 37.5]);
    expect(inputs.quarters.map((x) => x.subsidies)).toEqual([0, 300, 0, 0]);
    expect(inputs.quarters.map((x) => x.provisions)).toEqual([0, 0, 0, 400]);
    expect(inputs.quarters.map((x) => x.compensations)).toEqual([0, 50, 0, 0]);
    expect([inputs.modality, inputs.agrarian, inputs.hardToJustify]).toEqual([
      'normal',
      false,
      false,
    ]);
    expect(inputs.vat?.investments).toEqual([
      { year: 2024, vat: 1050, pct: 100, realEstate: false },
    ]);
    expect(activityExtras(toActivityInputs(manual.activity), 2026)[0].provisions).toBe(0);
    // Saved in the account with the rest of the form, only when typed.
    expect(toSaved(manual, NO_EXTRAS, {}).manual.activity).toEqual(activityOf(manual.activity));
    expect('activity' in toSaved(emptyManual(), NO_EXTRAS, {}).manual).toBe(false);
    // Without an activity, the draft is sent as before.
    const plain = buildInputs(emptyManual(), NO_EXTRAS, 2026, 1);
    expect('activity' in plain || 'modality' in plain).toBe(false);
    const prior = buildInputs(
      {
        ...emptyManual(),
        prior: { on: true, income: '100', expenses: '', payments: '', withheld: '' },
      },
      { ...NO_EXTRAS, priorNet: '9000' },
      2026,
      2
    );
    expect([prior.priorYearNet, prior.prior?.income]).toEqual([9000, 100]);
    // No activity last year: 0 € (instructions of the 130, box 13), whatever was typed; empty: unknown.
    const none = { ...NO_EXTRAS, priorNet: '9000', noPriorActivity: true };
    expect(buildInputs(emptyManual(), none, 2026, 1).priorYearNet).toBe(0);
    expect(buildInputs(emptyManual(), NO_EXTRAS, 2026, 1).priorYearNet).toBeNull();
    expect(toSaved(emptyManual(), none, {}).extras).toMatchObject({ noPriorActivity: true });
    expect('noPriorActivity' in toSaved(emptyManual(), NO_EXTRAS, {}).extras).toBe(false);
  });
});

describe('The activity in the self-employed screen', () => {
  beforeEach(() => {
    localStorage.clear();
    // Everything together (the assistant has its own suite).
    localStorage.setItem('mm_autonomo_assistant', 'expert');
  });

  it('sends the depreciation with the draft and shows the summary of the year', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
    api.businessApi.draft.mockResolvedValue(f.autonomoDraft());
    renderWithProviders(<BusinessView />, { api, plan: true });
    fireEvent.click(await screen.findByRole('button', { name: `+ ${k('assets')}` }));
    const year = new Date().getFullYear();
    type(`${k('asset.cost')} 1`, '1200');
    type(`${k('asset.group')} 1`, 's5');
    type(`${k('asset.start')} 1`, `${year}-01-01`);
    expect(await screen.findByText(k('summary', { year }))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.prepare') }));
    await waitFor(() => expect(api.businessApi.draft).toHaveBeenCalled());
    // 1,200 × 26 % = 312 a year, 78 a quarter.
    expect(api.businessApi.draft.mock.calls[0][2].quarters[0].depreciation).toBe(78);
  });
});
