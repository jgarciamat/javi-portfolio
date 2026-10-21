import { fireEvent, screen, within } from '@testing-library/react';
import { translate } from '@core/i18n/I18nContext';
import { formatMoney } from '@shared/utils/format';
import { DraftResult } from '@modules/finances/ui/components/AutonomoDraftResult';
import { explainDraft } from '@modules/finances/ui/components/AutonomoExplain';
import { splitBoxes } from '@modules/finances/ui/components/AutonomoVatResult';
import type { AutonomoDraft, Draft349, Draft390, TaxBox } from '@modules/finances/domain/types';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

/** The result of a draft with the whole VAT family: invented figures of a trader with the EU. */
const b = (box: string, amount: number, label = `Casilla ${box}`): TaxBox => ({
  box,
  label,
  amount,
});
// The screen shows the spaces of the money as plain ones (the matcher folds them).
const m = (n: number) => formatMoney(n, 'EUR', 'es').replace(/\u00a0/g, ' ');
const r = (key: string, values?: Record<string, string | number>) =>
  tr(`app.autonomo.vatr.${key}`, values);

const m349: Draft349 = {
  required: true,
  monthly: true,
  operators: [
    { key: 'E', vatId: 'FR00000000001', name: 'Client', base: 60000 },
    { key: 'A', vatId: '', name: '', base: 100 },
  ],
  rectifications: [
    {
      key: 'A',
      vatId: 'NL000000000B01',
      name: 'BV',
      base: 10,
      year: 2026,
      quarter: 1,
      previous: 20,
    },
    { key: 'I', vatId: '', name: '', base: 5, year: 2025, quarter: 4, previous: 6 },
  ],
  boxes: [
    b('operadores', 2, 'Número total de operadores intracomunitarios'),
    b('importe', 60100, 'Importe de las operaciones intracomunitarias'),
    b('operadoresRect', 1, 'Número total de operadores con rectificaciones'),
    b('importeRect', 10, 'Importe de las rectificaciones'),
  ],
  warnings: [
    { code: 'noVatId', name: '—' },
    { code: 'badPrefix', vatId: 'US1' },
    { code: 'vs59', expected: 50000, got: 60000 },
    { code: 'vs10', expected: 0, got: 100 },
    { code: 'monthly', amount: 60000 },
  ],
};

const m390: Draft390 = {
  sections: [
    { id: 'accrued', boxes: [b('05', 20500), b('06', 4305), b('701', 0)] },
    { id: 'result', boxes: [b('86', 1622)] },
    { id: 'liquidations', boxes: [b('95', 1622)] },
    { id: 'volume', boxes: [b('108', 31500)] },
    { id: 'prorrata', boxes: [] },
  ],
  prorrata: 80,
  reconciliation: [
    { quarter: 1, computed: 472, filed: 472, difference: 0 },
    { quarter: 2, computed: 672, filed: 600, difference: 72 },
    { quarter: 3, computed: -257, filed: null, difference: 0 },
    { quarter: 4, computed: 478, filed: null, difference: 0 },
  ],
  warnings: [
    { code: 'filedDiffers', quarter: 2, difference: 72 },
    { code: 'identity', expected: 1622, got: 1600 },
    { code: 'exonerated' },
  ],
};

const vat = (over: Partial<AutonomoDraft['vat']> = {}): AutonomoDraft['vat'] => ({
  result: 'refund',
  amountDue: -835,
  accrued: [
    b('01', 0),
    b('02', 4, 'Tipo 4 %'),
    b('07', 6000),
    b('08', 21, 'Tipo 21 %'),
    b('27', 1260),
  ],
  deductible: [b('28', 0), b('29', 0), b('45', 2095)],
  info: [b('59', 1500), b('60', 1000), b('62', 300), b('120', 0)],
  settlement: [b('46', -835), b('65', 100, '% atribuible'), b('66', -835), b('73', 835)],
  prorrata: 80,
  warnings: ['prorrataApplied', 'importDeferred'],
  ...over,
});

const draft = (over: Partial<AutonomoDraft> = {}) =>
  f.autonomoDraft({
    quarter: 4,
    vat: vat(),
    m349,
    m390,
    deadlines: [
      { model: '303', label: 'IVA', date: '2027-01-30' },
      { model: '349', label: 'UE', date: '2027-01-30' },
      { model: '390', label: 'Resumen', date: '2027-01-30' },
    ],
    ...over,
  });

describe('The whole VAT family in the result', () => {
  it('shows the full 303 grouped, the boxes at zero folded, its warnings and its deadline', () => {
    renderWithProviders(<DraftResult draft={draft()} inputs={null} />);
    const panel = screen
      .getByRole('heading', { name: r('title303') })
      .closest('section') as HTMLElement;
    const v = within(panel);
    expect(v.getByText(r('info.59', { amount: m(1500) }))).toBeInTheDocument();
    expect(v.getByText(r('info.62', { amount: m(300) }))).toBeInTheDocument();
    expect(v.getByText(r('prorrata', { pct: 80 }))).toBeInTheDocument();
    expect(v.getByText(r('warn.importDeferred'))).toBeInTheDocument();
    // A rate shows with its base, as a percentage; the deductible part is all zero but its total.
    expect(v.getByText('21 %')).toBeInTheDocument();
    expect(v.getAllByText(r('zero', { n: 2 })).length).toBeGreaterThan(0);
    expect(v.getByText('100 %')).toBeInTheDocument();
    expect(
      v.getByText(new RegExp(r('deadline', { model: '303', date: '·' }).split('·')[0]))
    ).toBeInTheDocument();
    expect(screen.getByText(tr('app.autonomo.vat.refund'))).toBeInTheDocument();
  });

  it('shows the 349 with its operators, corrections, summary and warnings', () => {
    renderWithProviders(<DraftResult draft={draft()} inputs={null} />);
    const panel = within(
      screen.getByRole('heading', { name: r('m349.title') }).closest('section') as HTMLElement
    );
    expect(panel.getByText(r('m349.plain', { n: 2, amount: m(60100) }))).toBeInTheDocument();
    expect(panel.getByText('FR00000000001')).toBeInTheDocument();
    expect(panel.getByText('2026 · 1T')).toBeInTheDocument();
    expect(panel.getByText(r('warn349.badPrefix', { vatId: 'US1' }))).toBeInTheDocument();
    expect(
      panel.getByText(r('warn349.vs59', { expected: m(50000), got: m(60000) }))
    ).toBeInTheDocument();
    expect(panel.getByText(r('warn349.monthly', { amount: m(60000) }))).toBeInTheDocument();
    // The counts of operators are numbers, not money.
    expect(panel.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('shows the 390 with its sections, the reconciliation and its warnings', () => {
    renderWithProviders(<DraftResult draft={draft()} inputs={null} />);
    const panel = within(
      screen.getByRole('heading', { name: r('m390.title') }).closest('section') as HTMLElement
    );
    expect(
      panel.getByText(r('m390.plain', { result: m(1622), paid: m(1622), volume: m(31500) }))
    ).toBeInTheDocument();
    expect(panel.getByText(r('m390.prorrata', { pct: 80 }))).toBeInTheDocument();
    expect(panel.getByText(r('m390.section.volume'))).toBeInTheDocument();
    // An empty section is not shown.
    expect(panel.queryByText(r('m390.section.prorrata'))).toBeNull();
    expect(
      panel.getByText(r('warn390.filedDiffers', { quarter: 2, difference: m(72) }))
    ).toBeInTheDocument();
    expect(panel.getByText(r('warn390.exonerated'))).toBeInTheDocument();
    expect(panel.queryByText(r('m390.noFiled'))).toBeNull();
    fireEvent.click(panel.getAllByText(r('zero', { n: 1 }))[0]);
  });

  it('of a draft saved before: no additional information, no 349 nor 390, no deadline of them', () => {
    const old = f.autonomoDraft({
      vat: { ...vat(), info: undefined, warnings: undefined, prorrata: undefined },
      m349: undefined,
      m390: {
        ...m390,
        prorrata: 100,
        warnings: [],
        reconciliation: m390.reconciliation.map((x) => ({ ...x, filed: null })),
      },
      deadlines: [],
    });
    renderWithProviders(<DraftResult draft={old} inputs={null} />);
    expect(screen.queryByText(r('info.title'))).toBeNull();
    expect(screen.queryByRole('heading', { name: r('m349.title') })).toBeNull();
    expect(screen.getByText(r('m390.noFiled'))).toBeInTheDocument();
    expect(screen.queryByText(r('m390.prorrata', { pct: 100 }))).toBeNull();
  });

  it('says when the RETA bases are of the latest order because the year has none yet', () => {
    const reta = { ...f.autonomoDraft().reta, year: 2027, known: false };
    const { unmount } = renderWithProviders(
      <DraftResult draft={f.autonomoDraft({ reta })} inputs={null} />
    );
    expect(
      screen.getByText(tr('app.autonomo.retaLatest', { year: 2027 }), { exact: false })
    ).toBeInTheDocument();
    unmount();
    renderWithProviders(
      <DraftResult draft={f.autonomoDraft({ reta: { ...reta, known: true } })} inputs={null} />
    );
    expect(
      screen.queryByText(tr('app.autonomo.retaLatest', { year: 2027 }), { exact: false })
    ).toBeNull();
  });

  it('says when a group has nothing at all', () => {
    renderWithProviders(
      <DraftResult
        draft={draft({
          vat: vat({ deductible: [b('28', 0)], warnings: [] }),
          m349: null,
          m390: null,
        })}
        inputs={null}
      />
    );
    expect(screen.getByText(r('allZero'))).toBeInTheDocument();
  });
});

describe('Which boxes are shown', () => {
  it('shows a rate with its base and the 65 with its 66 (in the 303; other forms reuse numbers)', () => {
    expect(splitBoxes([b('05', 20500), b('04', 0)], '390').shown.map((x) => x.box)).toEqual(['05']);
    // Alone, a rate or the 65 have nothing to go with.
    expect(splitBoxes([b('08', 21), b('65', 100)]).shown).toEqual([]);
    expect(splitBoxes([b('07', 0), b('08', 21), b('65', 100), b('66', 0)]).shown).toEqual([]);
    expect(
      splitBoxes([b('22', 1), b('23', 5.2), b('65', 100), b('66', 5)]).shown.map((x) => x.box)
    ).toEqual(['22', '23', '65', '66']);
  });
});

describe('The 303 to be refunded in plain words', () => {
  it('says what is refunded', () => {
    const { vat: text } = explainDraft(
      (key, vars) => translate('es', key, vars),
      (n) => m(n),
      { vat: vat(), irpf: f.autonomoDraft().irpf }
    );
    expect(text).toBe(
      translate('es', 'app.autonomo.explain.vat.refund', {
        due: m(835),
        accrued: m(1260),
        deductible: m(2095),
      })
    );
  });
});
