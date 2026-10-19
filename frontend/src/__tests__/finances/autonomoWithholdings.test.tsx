import { useState } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { translate } from '@core/i18n/I18nContext';
import { formatMoney } from '@shared/utils/format';
import { BusinessView } from '@modules/finances/ui/views/BusinessView';
import { emptyManual, type ManualForm } from '@modules/finances/ui/components/AutonomoManual';
import {
  WithholdingsForm,
  WithholdingsPanel,
  explainWithholdings,
} from '@modules/finances/ui/components/AutonomoWithholdings';
import { withWithholding } from '@modules/finances/ui/components/withholdingForm';
import { withholdingsFor, type WithholdingQuarter } from '@modules/finances/domain/withholdings';
import type { ImportedInvoice } from '@modules/finances/domain/invoiceLedger';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

const money = (n: number) => formatMoney(n, 'EUR', 'es');
/** Text as Testing Library compares it: every space a plain one. */
const spaced = (text: string) => text.replace(/\s/g, ' ');

let n = 0;
const invoice = (over: Partial<ImportedInvoice>): ImportedInvoice => ({
  id: `w${++n}`,
  book: 'received',
  kind: 'management',
  excluded: false,
  date: '2026-05-10',
  quarter: 2,
  base: 100,
  vatRate: 21,
  vat: 21,
  total: 121,
  withheld: 0,
  concept: 'Gestoría Pérez',
  ...over,
});

let latest: ManualForm = emptyManual();
function FormHarness({ start }: { start: ManualForm }) {
  const [form, setForm] = useState(start);
  latest = form;
  return <WithholdingsForm form={form} onChange={setForm} year={2026} upTo={2} />;
}

const field = (label: string, q = 2) =>
  screen.getByLabelText(tr('app.autonomo.wh.fieldOf', { field: tr(label), n: q }));
const type = (label: string, value: string, q = 2) =>
  fireEvent.change(field(label, q), { target: { value } });

describe('Withholdings you make, in step 2', () => {
  it('takes employees, pay in kind, professionals and rent of each quarter', () => {
    renderWithProviders(<FormHarness start={emptyManual()} />, { authenticated: false });
    type('app.autonomo.wh.field.staff.people', '2');
    type('app.autonomo.wh.field.staff.paid', '7500');
    type('app.autonomo.wh.field.staff.withheld', '750');
    expect(
      screen.getByText(spaced(tr('app.autonomo.wh.totals', { m111: money(750), m115: money(0) })))
    ).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(tr('app.autonomo.wh.kindOn')));
    type('app.autonomo.wh.field.kind.people', '1');
    type('app.autonomo.wh.field.kind.paid', '300');
    type('app.autonomo.wh.field.kind.withheld', '30');
    type('app.autonomo.wh.field.pros.people', '1');
    type('app.autonomo.wh.field.pros.paid', '1000');
    type('app.autonomo.wh.field.pros.withheld', '150');
    type('app.autonomo.wh.field.rent.people', '1');
    type('app.autonomo.wh.field.rent.paid', '400');
    // The earlier quarters are folded.
    fireEvent.click(screen.getByRole('button', { name: /^1\.º trimestre/ }));
    type('app.autonomo.wh.field.rent.withheld', '76', 1);
    expect(latest.withholdings?.[1]).toMatchObject({
      staff: {
        people: '2',
        paid: '7500',
        withheld: '750',
        kindPeople: '1',
        kindPaid: '300',
        kindWithheld: '30',
      },
      pros: { people: '1', paid: '1000', withheld: '150' },
      rent: { people: '1', paid: '400', withheld: '' },
    });
    expect(latest.withholdings?.[0].rent.withheld).toBe('76');
    // 750 + 30 + 150 = 930 for the 111 of the second quarter.
    expect(
      screen.getByText(spaced(tr('app.autonomo.wh.totals', { m111: money(930), m115: money(0) })))
    ).toBeInTheDocument();
  });

  it('says which quarters came from a filed form, and can take that back', () => {
    let start = withWithholding(emptyManual(), 2, {
      staff: {
        people: '2',
        paid: '7500',
        withheld: '750',
        kindPeople: '',
        kindPaid: '20',
        kindWithheld: '',
      },
      pros: { people: '2', paid: '350', withheld: '36.5' },
      filed111: true,
    });
    start = withWithholding(start, 2, {
      rent: { people: '1', paid: '400', withheld: '76' },
      filed115: true,
    });
    renderWithProviders(<FormHarness start={start} />, { authenticated: false });
    // Pay in kind typed before: its fields are open.
    expect(field('app.autonomo.wh.field.kind.paid')).toHaveValue('20');
    expect(screen.getByText(tr('app.autonomo.wh.filed.111'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.wh.undo.111') }));
    expect(latest.withholdings?.[1]).toMatchObject({
      filed111: false,
      staff: { people: '', paid: '' },
      pros: { people: '' },
      rent: { people: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.wh.undo.115') }));
    expect(latest.withholdings?.[1]).toMatchObject({ filed115: false, rent: { people: '' } });
    expect(screen.queryByText(tr('app.autonomo.wh.filed.115'))).toBeNull();
  });
});

const data = (over: Partial<WithholdingQuarter> = {}): WithholdingQuarter => ({
  staff: { people: 0, paid: 0, withheld: 0, kindPeople: 0, kindPaid: 0, kindWithheld: 0 },
  pros: { people: 0, paid: 0, withheld: 0 },
  rent: { people: 0, paid: 0, withheld: 0 },
  filed111: false,
  filed115: false,
  ...over,
});

const explain = (
  d: WithholdingQuarter,
  invoices: ImportedInvoice[] = [],
  locale: 'es' | 'en' = 'es'
) =>
  explainWithholdings(
    (key, vars) => translate(locale, key, vars),
    (x) => formatMoney(x, 'EUR', locale),
    withholdingsFor({ year: 2026, quarter: 2, invoices, data: d, income: 1000 })
  );

describe('The withholdings in one sentence', () => {
  it('tells what was withheld from whom', () => {
    const pros = [
      invoice({ base: 2000, retention: 300 }),
      invoice({ concept: 'Abogada Ruiz', base: 1000, retention: 140 }),
    ];
    const staff = data({
      staff: { people: 1, paid: 1000, withheld: 100, kindPeople: 0, kindPaid: 0, kindWithheld: 0 },
    });
    expect(explain(staff, pros).m111).toBe(
      tr('app.autonomo.wh.explain.111.pay', {
        due: money(540),
        parts: `${money(440)} a 2 profesionales y ${money(100)} a 1 empleado`,
      })
    );
    const one = explain(
      data({
        staff: {
          people: 3,
          paid: 9000,
          withheld: 900,
          kindPeople: 0,
          kindPaid: 0,
          kindWithheld: 0,
        },
        rent: { people: 2, paid: 2000, withheld: 380 },
      }),
      [invoice({ base: 100, retention: 15 })]
    );
    expect(one.m111).toContain(`${money(15)} a 1 profesional y ${money(900)} a 3 empleados`);
    expect(one.m115).toBe(
      tr('app.autonomo.wh.explain.115.pay', {
        due: money(380),
        base: money(2000),
        who: '2 arrendadores',
      })
    );
    const landlord = explain(data({ rent: { people: 1, paid: 400, withheld: 76 } }));
    expect(landlord.m115).toContain('1 arrendador');
    expect(landlord.m111).toBe(tr('app.autonomo.wh.explain.111.none'));
  });

  it('says when nothing is filed and when a nil return is', () => {
    expect(explain(data())).toEqual({
      m111: tr('app.autonomo.wh.explain.111.none'),
      m115: tr('app.autonomo.wh.explain.115.none'),
    });
    expect(
      explain(
        data({
          pros: { people: 1, paid: 500, withheld: 0 },
          rent: { people: 1, paid: 500, withheld: 0 },
        })
      )
    ).toEqual({
      m111: tr('app.autonomo.wh.explain.111.zero'),
      m115: tr('app.autonomo.wh.explain.115.zero'),
    });
    expect(explain(data({ pros: { people: 1, paid: 100, withheld: 15 } }), [], 'en').m111).toBe(
      'Form 111: €15.00 to pay: you withheld €15.00 from 1 professional.'
    );
  });
});

describe('The panel of the modelos 111 and 115, in step 3', () => {
  it('shows the deadline, the sentences, the warnings with their invoice and the boxes', () => {
    const odd = invoice({ concept: '', base: 1000, retention: 100 });
    const rent = [1, 2, 3].map((q) =>
      invoice({ concept: 'Local Mayor', kind: 'rent', quarter: q as 1 | 2 | 3, base: 400 })
    );
    const pro = invoice({ concept: 'Diseño', kind: 'other', withholding: 'professional' });
    const form = withWithholding({ ...emptyManual(), invoices: [odd, ...rent, pro] }, 2, {
      staff: {
        people: '',
        paid: '1000',
        withheld: '100',
        kindPeople: '',
        kindPaid: '',
        kindWithheld: '',
      },
      pros: { people: '1', paid: '100', withheld: '200' },
      rent: { people: '1', paid: '400', withheld: '76' },
    });
    const onFocus = jest.fn();
    renderWithProviders(
      <WithholdingsPanel form={form} year={2026} quarter={2} onFocus={onFocus} />,
      { authenticated: false }
    );
    const panel = screen.getByRole('region', { name: tr('app.autonomo.wh.title') });
    expect(panel).toHaveTextContent(tr('app.autonomo.wh.deadline', { n: 2, date: '20 jul 2026' }));
    expect(panel).toHaveTextContent(
      tr('app.autonomo.wh.warn.rate', {
        who: tr('app.autonomo.review.noName'),
        rate: '10',
        expected: '15 % o 7 %',
      })
    );
    expect(panel).toHaveTextContent(
      tr('app.autonomo.wh.warn.rentNoRetention', { who: 'Local Mayor', year: 2026 })
    );
    expect(panel).toHaveTextContent(tr('app.autonomo.wh.warn.proNoRetention', { who: 'Diseño' }));
    expect(panel).toHaveTextContent(
      tr('app.autonomo.wh.warn.people', { part: tr('app.autonomo.wh.part.staff') })
    );
    expect(panel).toHaveTextContent(
      tr('app.autonomo.wh.warn.over', { part: tr('app.autonomo.wh.part.pros') })
    );
    expect(panel).toHaveTextContent(tr('app.autonomo.wh.warn.noIncome'));
    const buttons = within(panel).getAllByRole('button', {
      name: tr('app.autonomo.wh.openInvoice'),
    });
    expect(buttons).toHaveLength(3);
    fireEvent.click(buttons[0]);
    const ask = onFocus.mock.calls[0][0];
    expect(ask(null)).toEqual({ id: odd.id, n: 1 });
    expect(ask({ id: 'x', n: 4 })).toEqual({ id: odd.id, n: 5 });
    // Both forms with their boxes; the number of payees is a count, not an amount.
    const tables = within(panel).getAllByRole('table');
    expect(tables).toHaveLength(2);
    expect(
      within(tables[0]).getByText('Actividades económicas dinerarios · N.º perceptores').nextSibling
    ).toHaveTextContent(/^2$/);
    expect(within(tables[1]).getAllByText(spaced(money(76)))).toHaveLength(2);
  });

  it('has no boxes and no warnings for a quarter without withholdings', () => {
    renderWithProviders(
      <WithholdingsPanel form={emptyManual()} year={2026} quarter={4} onFocus={jest.fn()} />,
      { authenticated: false }
    );
    const panel = screen.getByRole('region', { name: tr('app.autonomo.wh.title') });
    expect(within(panel).queryByRole('table')).toBeNull();
    expect(within(panel).queryByRole('list')).toBeNull();
    expect(panel).toHaveTextContent('20 ene 2027');
  });
});

describe('The withholdings on the self-employed screen', () => {
  beforeEach(() => {
    localStorage.clear();
    freezeTime('2026-07-10T12:00:00');
  });
  afterEach(() => restoreTime());

  it('add a line to the summary that goes to their panel', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
    renderWithProviders(<BusinessView />, { api, plan: true });
    await screen.findByLabelText(tr('app.autonomo.workArea'));
    const summary = screen.getByRole('complementary', { name: tr('app.autonomo.summary.label') });
    const line = /^Retenciones: 111 750,00\s€ · 115 0,00\s€$/;
    expect(within(summary).queryByText(line)).toBeNull();
    fireEvent.change(field('app.autonomo.wh.field.staff.people', 3), { target: { value: '2' } });
    fireEvent.change(field('app.autonomo.wh.field.staff.withheld', 3), {
      target: { value: '750' },
    });
    fireEvent.click(within(summary).getByRole('button', { name: line }));
    expect(screen.getByRole('region', { name: tr('app.autonomo.wh.title') })).toBeInTheDocument();
  });
});
