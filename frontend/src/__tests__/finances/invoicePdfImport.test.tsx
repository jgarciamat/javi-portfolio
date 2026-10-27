import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  AutonomoManual,
  emptyManual,
  type ManualForm,
} from '@modules/finances/ui/components/AutonomoManual';
import type { ReviewFocus } from '@modules/finances/ui/components/InvoiceReview';
import { ImportChecks } from '@modules/finances/ui/components/ImportChecks';
import { I18nProvider } from '@core/i18n/I18nContext';
import * as reader from '@modules/finances/application/taxModelPdf';
import { parseInvoiceTokens, type InvoicePdf } from '@modules/finances/domain/invoicePdf';
import type { PdfToken } from '@modules/finances/domain/taxModelPdf';
import { checkImport } from '@modules/finances/domain/importChecks';
import { toManualData } from '@modules/finances/ui/components/AutonomoManual';
import { KIND_PREFERENCES_KEY, ME_KEY } from '@modules/finances/ui/components/importForm';
import { renderWithProviders, tr } from '@test-utils/render';
import { BusinessView } from '@modules/finances/ui/views/BusinessView';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import FIXTURES from './fixtures/invoicePdfTokens.json';

jest.mock('@modules/finances/ui/components/AutonomoWizard', () =>
  jest.requireActual('@test-utils/expertScreens').autonomoWithForm()
);

jest.mock('@modules/finances/application/taxModelPdf');
const read = reader.readImportPdf as jest.MockedFunction<typeof reader.readImportPdf>;

const fixtures = FIXTURES as unknown as Record<string, PdfToken[][]>;
/** An example invoice as the reader leaves it, from the pieces of its real PDF. */
const invoiceOf = (file: string): InvoicePdf => {
  const parsed = parseInvoiceTokens(fixtures[file]);
  if (!parsed.ok) throw new Error(file);
  return parsed.invoice;
};
const LUZ = '01-luz-cabecera-izquierda.pdf';
const RESTAURANTE = '03-restaurante-dos-tipos-iva.pdf';
const EMITIDA = '04-emitida-profesional-retencion-irpf.pdf';
const ABONO = '05-abono-rectificativa.pdf';
const RECARGO = '08-mayorista-recargo-equivalencia.pdf';
const GESTORIA = '11-gestoria-recibida-con-retencion.pdf';

/** What the mocked reader gives for each file name. */
let pdfs: Record<string, reader.ImportPdf | Error> = {};
const invoice = (file: string, over: Partial<InvoicePdf> = {}): reader.ImportPdf => ({
  kind: 'invoice',
  parsed: { ok: true, invoice: { ...invoiceOf(file), ...over } },
});

let latest: ManualForm = emptyManual();
let focusCalls = 0;

function Harness() {
  const [form, setForm] = useState<ManualForm>(emptyManual());
  const [focus, setFocus] = useState<ReviewFocus | null>(null);
  latest = form;
  return (
    <AutonomoManual
      form={form}
      onChange={setForm}
      upTo={4}
      year={2026}
      onPeriod={jest.fn()}
      years={[2026]}
      focus={focus}
      onShow={(id) => {
        focusCalls++;
        setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }));
      }}
    />
  );
}

const show = () =>
  render(
    <I18nProvider>
      <Harness />
    </I18nProvider>
  );

const pdf = (name: string) => new File(['%PDF'], name, { type: 'application/pdf' });
const choose = async (...names: string[]) => {
  const before = read.mock.calls.length;
  fireEvent.change(screen.getByLabelText(tr('app.autonomo.import.files')), {
    target: { files: names.map(pdf) },
  });
  await waitFor(() => expect(read.mock.calls.length).toBe(before + names.length));
  await screen.findByRole('button', { name: tr('app.autonomo.import.choose') });
};
const fileResult = (name: string) =>
  screen.getByText(name, { selector: 'strong' }).closest('li') as HTMLElement;
const received = () => latest.invoices.filter((i) => i.book === 'received');
const issued = () => latest.invoices.filter((i) => i.book === 'issued');

beforeEach(() => {
  localStorage.clear();
  // Everything together (the assistant has its own suite).
  localStorage.setItem('mm_autonomo_assistant', 'expert');
  focusCalls = 0;
  pdfs = {
    [LUZ]: invoice(LUZ),
    [RESTAURANTE]: invoice(RESTAURANTE),
    [EMITIDA]: invoice(EMITIDA),
    [ABONO]: invoice(ABONO),
    [RECARGO]: invoice(RECARGO),
    [GESTORIA]: invoice(GESTORIA),
    'escaneada.pdf': { kind: 'invoice', parsed: { ok: false, reason: 'noText' } },
    'contrato.pdf': { kind: 'invoice', parsed: { ok: false, reason: 'notInvoice' } },
    'dolares.pdf': { kind: 'invoice', parsed: { ok: false, reason: 'currency', currency: 'USD' } },
    'rota.pdf': new Error('broken'),
    'modelo.pdf': {
      kind: 'model',
      parsed: { ok: true, data: { model: '303', year: 2026, quarter: 2, boxes: { '07': 100 } } },
    },
  };
  read.mockReset();
  read.mockImplementation(async (file: File) => {
    const found = pdfs[file.name];
    if (found instanceof Error) throw found;
    return found;
  });
});

describe('Dropping invoices in PDF on the import', () => {
  it('reads many at once: each says what it was, a summary of all, and they go to the review', async () => {
    show();
    const zone = screen.getByText(tr('app.autonomo.import.drop')).parentElement as HTMLElement;
    fireEvent.drop(zone, {
      dataTransfer: {
        files: [LUZ, RESTAURANTE, RECARGO, 'escaneada.pdf', 'contrato.pdf', 'dolares.pdf'].map(pdf),
      },
    });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(6));
    await screen.findByText(/Resumen de 6 archivos/);
    expect(screen.getByText(/Resumen de 6 archivos/)).toHaveTextContent(
      [
        tr('app.autonomo.import.summary.added', { n: 2 }),
        tr('app.autonomo.import.summary.review', { n: 1 }),
        tr('app.autonomo.import.summary.error', { n: 3 }),
      ].join(' · ')
    );
    expect(within(fileResult(LUZ)).getByRole('status')).toHaveTextContent(
      /Factura de Eléctrica del Ejemplo SA, 12 mar 2026, 121,00\s€ · T1 · añadida como gasto/
    );
    expect(within(fileResult(RESTAURANTE)).getByRole('status')).toHaveTextContent(/T2/);
    expect(within(fileResult(RECARGO)).getByText(/Revisa: lleva recargo/)).toBeInTheDocument();
    expect(within(fileResult('escaneada.pdf')).getByRole('alert')).toHaveTextContent(
      tr('app.autonomo.pdf.error.noText')
    );
    expect(within(fileResult('contrato.pdf')).getByRole('alert')).toHaveTextContent(
      tr('app.autonomo.pdf.error.notInvoice')
    );
    expect(within(fileResult('dolares.pdf')).getByRole('alert')).toHaveTextContent(
      tr('app.autonomo.pdf.error.currency', { currency: 'USD' })
    );

    // Two rates are two invoices of the review; the quarters follow them.
    expect(received()).toHaveLength(4);
    expect(received().every((i) => i.source === 'pdf')).toBe(true);
    expect(latest.quarters[0].expenses).toEqual([
      { kind: 'supplies', amount: '121', vatRate: 21, days: '' },
    ]);
    expect(latest.quarters[1].expenses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'meals', amount: '66', vatRate: 10, days: '1' }),
      ])
    );
    expect(screen.getByText(tr('app.autonomo.review.pdf.hint'))).toBeInTheDocument();
    expect(screen.getAllByText(tr('app.autonomo.review.pdf.flag'))).toHaveLength(1);
  });

  it('importing the same invoice again adds nothing', async () => {
    show();
    await choose(LUZ);
    await choose(LUZ, ABONO);
    expect(within(fileResult(LUZ)).getByText(/ya estaba importada/)).toBeInTheDocument();
    expect(screen.getByText(/Resumen de 2 archivos/)).toHaveTextContent(
      tr('app.autonomo.import.summary.again', { n: 1 })
    );
    expect(received()).toHaveLength(2);
    // The credit note takes its amount back from the quarter.
    expect(received().find((i) => i.base < 0)).toMatchObject({ base: -50, quarter: 2 });
  });

  it('shows the invoice of a result in the review', async () => {
    show();
    await choose(LUZ);
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.autonomo.pdf.showOf', { file: LUZ }) })
    );
    expect(focusCalls).toBe(1);
    const id = received()[0].id;
    await waitFor(() =>
      expect(document.getElementById(`autonomo-invoice-${id}`)).toHaveClass('is-highlighted')
    );
  });

  it('still reads the filed modelos, and says when a PDF cannot be opened', async () => {
    show();
    await choose('modelo.pdf', 'rota.pdf');
    expect(within(fileResult('modelo.pdf')).getByRole('status')).toHaveTextContent(
      tr('app.autonomo.model.done.303', { year: 2026, quarter: 2 })
    );
    expect(within(fileResult('rota.pdf')).getByRole('alert')).toHaveTextContent(
      tr('app.autonomo.model.error.unreadable')
    );
    // The summary only counts what did not go in.
    expect(screen.getByText(/Resumen de 2 archivos/)).toHaveTextContent(
      tr('app.autonomo.import.summary.error', { n: 1 })
    );
  });

  it('says what does not add up and keeps an incomplete invoice out until it is completed', async () => {
    pdfs['raro.pdf'] = invoice(LUZ, {
      date: null,
      total: 125,
      review: ['date', 'mismatch'],
      mismatch: { expected: 121, total: 125 },
      taxes: [{ rate: 21, base: 100, vat: 21 }],
    });
    show();
    await choose('raro.pdf');
    const result = fileResult('raro.pdf');
    expect(within(result).getByRole('status')).toHaveTextContent(/sin fecha/);
    expect(
      within(result).getByText(/suman 121,00\s€, pero el total impreso es 125,00\s€/)
    ).toBeInTheDocument();
    expect(within(result).getByText(tr('app.autonomo.pdf.missing'))).toBeInTheDocument();
    expect(received()[0]).toMatchObject({ excluded: true, missing: ['date'] });
    expect(latest.quarters[0].expenses).toEqual([]);
  });
});

describe('Choosing the files and invoices without a printed total', () => {
  it('the button opens the file picker', () => {
    show();
    const click = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.import.choose') }));
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('says the total the amounts give when none is printed', async () => {
    pdfs['sin-total.pdf'] = invoice(LUZ, { total: null, review: ['noTotal'] });
    show();
    await choose('sin-total.pdf');
    expect(within(fileResult('sin-total.pdf')).getByRole('status')).toHaveTextContent(/121,00\s€/);
  });
});

describe('Issued or received', () => {
  it('asks about an invoice with IRPF withheld from a company, and learns who the person is', async () => {
    show();
    await choose(EMITIDA);
    const ask = screen.getByRole('group', {
      name: tr('app.autonomo.pdf.askLabel', { file: EMITIDA }),
    });
    expect(within(ask).getByText(tr('app.autonomo.pdf.ask'))).toBeInTheDocument();
    expect(latest.invoices).toHaveLength(0);
    fireEvent.click(within(ask).getByRole('button', { name: tr('app.autonomo.pdf.is.issued') }));

    expect(issued()).toEqual([
      expect.objectContaining({ concept: 'Estudio Norte Ejemplo SL', withheld: 150, base: 1000 }),
    ]);
    expect(latest.quarters[1].income.r21).toBe('1000');
    expect(latest.quarters[1].withheld).toBe('150');
    expect(JSON.parse(localStorage.getItem(ME_KEY) as string)).toEqual({
      nif: '12345678Z',
      name: 'Laura Martín Gómez',
    });
    expect(
      screen.getByText(/Reconozco las facturas que emites por: Laura Martín Gómez · 12345678Z/)
    ).toBeInTheDocument();

    // From now on the tax id decides alone: an invoice to her is an expense, without asking.
    await choose(LUZ);
    expect(
      within(fileResult(LUZ)).queryByRole('button', {
        name: tr('app.autonomo.pdf.mineOf', { file: LUZ }),
      })
    ).not.toBeInTheDocument();
    expect(received()).toHaveLength(1);

    // One that is neither hers nor to her: asked; the answer «expense» is taken as it is.
    pdfs['otra.pdf'] = invoice(LUZ, { client: { name: 'Otra Persona', nif: '99999999R' } });
    await choose('otra.pdf');
    fireEvent.click(
      within(fileResult('otra.pdf')).getByRole('button', {
        name: tr('app.autonomo.pdf.is.received'),
      })
    );
    expect(within(fileResult('otra.pdf')).getByText(/ya estaba importada/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.pdf.forget') }));
    expect(localStorage.getItem(ME_KEY)).toBeNull();
    expect(screen.queryByText(/Reconozco las facturas/)).not.toBeInTheDocument();
  });

  it('an invoice taken as an expense can be moved to income: «I issued it»', async () => {
    show();
    await choose(GESTORIA);
    expect(received()).toEqual([
      expect.objectContaining({ retention: 9, nif: 'B81234560', kind: 'management' }),
    ]);
    expect(latest.quarters[0].expenses).toHaveLength(1);
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.autonomo.pdf.mineOf', { file: GESTORIA }) })
    );
    expect(received()).toHaveLength(0);
    expect(issued()).toEqual([
      expect.objectContaining({ concept: 'Laura Martín Gómez', withheld: 9 }),
    ]);
    expect(latest.quarters[0].expenses).toEqual([]);
    expect(latest.quarters[0].income.r21).toBe('60');
    expect(
      screen.queryByRole('button', { name: tr('app.autonomo.pdf.mineOf', { file: GESTORIA }) })
    ).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(ME_KEY) as string).nif).toBe('B81234560');
  });

  it('does not learn anything from an issuer without name or tax id, nor twice', async () => {
    pdfs['anon.pdf'] = invoice(EMITIDA, { issuer: { name: null, nif: null } });
    show();
    await choose('anon.pdf');
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.pdf.is.issued') }));
    expect(localStorage.getItem(ME_KEY)).toBeNull();
    expect(issued()).toHaveLength(1);
  });
});

describe('Correcting an invoice read from a PDF in the review', () => {
  const editButton = (name: RegExp) => screen.getByRole('button', { name });

  it('edits date, supplier, base, VAT rate and kind in place, validated and accessible', async () => {
    pdfs['raro.pdf'] = invoice(LUZ, {
      date: null,
      review: ['date', 'amount'],
      taxes: [{ rate: null, base: null, vat: null }],
    });
    show();
    await choose('raro.pdf');
    const row = () => document.querySelector('tr.is-editing') as HTMLElement;
    const invoiceRow = screen
      .getByText('Eléctrica del Ejemplo SA', { selector: 'td' })
      .closest('tr') as HTMLElement;
    expect(within(invoiceRow).getByRole('checkbox')).toBeDisabled();
    expect(within(invoiceRow).getByText('—')).toBeInTheDocument();
    expect(within(invoiceRow).getByText(/faltan datos por completar/)).toBeInTheDocument();
    expect(
      within(invoiceRow).queryByRole('button', { name: /Dar por buena/ })
    ).not.toBeInTheDocument();

    fireEvent.click(editButton(/Corregir la factura de Eléctrica del Ejemplo SA del sin fecha/));
    const editing = row();
    expect(editing).toHaveAccessibleName(/Corrigiendo la factura de Eléctrica/);
    const date = within(editing).getByLabelText(/Fecha de la factura de/);
    expect(date).toHaveFocus();
    const who = within(editing).getByLabelText(/Proveedor o cliente de la factura/);
    const base = within(editing).getByLabelText(/Base imponible de la factura/);
    const rate = within(editing).getByLabelText(/Tipo de IVA de la factura/);
    fireEvent.change(who, { target: { value: '  ' } });
    fireEvent.click(
      within(editing).getByRole('button', { name: tr('app.autonomo.review.pdf.save') })
    );

    // Every wrong field says why, and the first one gets the focus.
    for (const [field, key] of [
      [date, 'date'],
      [who, 'who'],
      [base, 'base'],
      [rate, 'rate'],
    ] as const) {
      expect(field).toHaveAttribute('aria-invalid', 'true');
      expect(field).toHaveAccessibleDescription(tr(`app.autonomo.review.pdf.error.${key}`));
    }
    expect(date).toHaveFocus();
    // Quarter, VAT and total wait for the date, base and rate (and the empty choice of rate).
    expect(within(editing).getAllByText('—')).toHaveLength(4);

    fireEvent.change(date, { target: { value: '2026-05-04' } });
    fireEvent.change(who, { target: { value: 'Luz Ejemplo SA' } });
    fireEvent.change(base, { target: { value: '1.000,00' } });
    fireEvent.change(rate, { target: { value: '10' } });
    expect(within(editing).getByText('T2')).toBeInTheDocument();
    expect(within(editing).getByText(/1100,00\s€|1\.100,00\s€/)).toBeInTheDocument();
    fireEvent.change(within(editing).getByLabelText(/Tipo de gasto de la factura/), {
      target: { value: 'material' },
    });
    fireEvent.keyDown(base, { key: 'Enter' });

    expect(row()).toBeNull();
    expect(received()[0]).toMatchObject({
      date: '2026-05-04',
      quarter: 2,
      concept: 'Luz Ejemplo SA',
      base: 1000,
      vatRate: 10,
      vat: 100,
      total: 1100,
      kind: 'material',
      excluded: false,
      review: [],
      missing: [],
    });
    expect(latest.quarters[1].expenses).toEqual([
      { kind: 'material', amount: '1100', vatRate: 10, days: '' },
    ]);
    expect(JSON.parse(localStorage.getItem(KIND_PREFERENCES_KEY) as string)).toEqual({
      'luz ejemplo': 'material',
    });
    await waitFor(() => expect(editButton(/Corregir la factura de Luz Ejemplo SA/)).toHaveFocus());
  });

  it('Escape or «Cancel» leave the invoice as it was; keeping base and rate keeps the printed VAT', async () => {
    pdfs['redondeo.pdf'] = invoice(LUZ, {
      taxes: [{ rate: 21, base: 100, vat: 21.01 }],
      review: ['mismatch'],
    });
    show();
    await choose('redondeo.pdf');
    fireEvent.click(editButton(/Corregir la factura de Eléctrica/));
    const editing = document.querySelector('tr.is-editing') as HTMLElement;
    fireEvent.keyDown(within(editing).getByLabelText(/Proveedor o cliente/), { key: 'Escape' });
    expect(document.querySelector('tr.is-editing')).toBeNull();
    fireEvent.click(editButton(/Corregir la factura de Eléctrica/));
    fireEvent.keyDown(screen.getByLabelText(/Tipo de IVA de la factura/), { key: 'Enter' });
    fireEvent.keyDown(screen.getByLabelText(/Tipo de IVA de la factura/), { key: 'a' });
    expect(document.querySelector('tr.is-editing')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.review.pdf.cancel') }));
    expect(document.querySelector('tr.is-editing')).toBeNull();
    expect(received()[0].review).toEqual(['mismatch']);

    fireEvent.click(editButton(/Corregir la factura de Eléctrica/));
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.review.pdf.save') }));
    expect(received()[0]).toMatchObject({ vat: 21.01, total: 121.01, review: [] });
    // The kind did not change: nothing is remembered.
    expect(localStorage.getItem(KIND_PREFERENCES_KEY)).toBeNull();
  });

  it('«It is right» clears the doubts of a reading without changing it', async () => {
    show();
    await choose(RECARGO, EMITIDA);
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.pdf.is.issued') }));
    fireEvent.click(
      screen.getByRole('button', { name: /Dar por buena la factura de Distribuciones/ })
    );
    expect(received()[0].review).toEqual([]);
    expect(screen.queryByText(tr('app.autonomo.review.pdf.flag'))).not.toBeInTheDocument();

    // An issued invoice shows its withholding while it is corrected.
    fireEvent.click(editButton(/Corregir la factura de Estudio Norte/));
    const editing = document.querySelector('tr.is-editing') as HTMLElement;
    expect(within(editing).getByText(/150,00\s€/)).toBeInTheDocument();
    expect(within(editing).queryByLabelText(/Tipo de gasto/)).not.toBeInTheDocument();
  });

  it('correcting one line of an invoice with two rates leaves the other as it was', async () => {
    show();
    await choose(RESTAURANTE);
    const [ten, twentyOne] = received();
    fireEvent.click(
      screen.getAllByRole('button', { name: /Corregir la factura de Restaurante/ })[0]
    );
    fireEvent.change(screen.getByLabelText(/Base imponible de la factura/), {
      target: { value: '70' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.autonomo.review.pdf.save') }));
    expect(received()).toEqual([
      expect.objectContaining({ id: ten.id, base: 70, vat: 7 }),
      twentyOne,
    ]);
  });

  it('only invoices read from a PDF can be corrected', async () => {
    show();
    await choose(LUZ);
    const { list } = { list: latest.invoices };
    expect(list[0].source).toBe('pdf');
    expect(screen.getAllByRole('button', { name: /Corregir la factura/ })).toHaveLength(1);
  });
});

describe('On the self-employed screen', () => {
  it('a dropped invoice goes to the review and its result shows it there', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
    renderWithProviders(<BusinessView />, { api, plan: true });
    await screen.findByLabelText(tr('app.autonomo.import.files'));
    await choose(LUZ);
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.autonomo.pdf.showOf', { file: LUZ }) })
    );
    const row = screen
      .getByText('Eléctrica del Ejemplo SA', { selector: 'td' })
      .closest('tr') as HTMLElement;
    await waitFor(() => expect(row).toHaveClass('is-highlighted'));
    expect(
      screen.getByText(/1 facturas leídas de PDF necesitan|Antes de calcular/)
    ).toBeInTheDocument();
  });
});

describe('«Before you calculate» with invoices read from a PDF', () => {
  it('warns about the ones to check, also the ones left out until completed', () => {
    const base = invoiceOf(LUZ);
    const invoices = [
      {
        ...base,
        id: 'a',
        book: 'received',
        kind: 'supplies',
        excluded: true,
        source: 'pdf',
        review: ['date'],
        missing: ['date'],
        date: '',
        quarter: 1,
        base: 0,
        vatRate: 21,
        vat: 0,
        total: 0,
        withheld: 0,
        concept: 'Sin Fecha SL',
      },
      {
        ...base,
        id: 'b',
        book: 'received',
        kind: 'supplies',
        excluded: false,
        source: 'pdf',
        review: [],
        date: '2026-02-01',
        quarter: 1,
        base: 10,
        vatRate: 21,
        vat: 2.1,
        total: 12.1,
        withheld: 0,
        concept: 'Bien SL',
      },
    ] as unknown as ManualForm['invoices'];
    const checks = checkImport({
      invoices,
      manual: toManualData(emptyManual()),
      year: 2026,
      today: '2026-03-01',
      from: 1,
      upTo: 1,
      model130: null,
      hardToJustify: false,
    });
    expect(checks[0]).toMatchObject({ code: 'pdfReview', level: 'warn', invoices: ['a'] });
    const open = jest.fn();
    render(
      <I18nProvider>
        <ImportChecks checks={checks} invoices={invoices} onInvoice={open} onQuarter={jest.fn()} />
      </I18nProvider>
    );
    expect(
      screen.getByText(/1 facturas leídas de PDF necesitan que las compruebes/)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ver sin fecha · Sin Fecha SL/ }));
    expect(open).toHaveBeenCalledWith('a');
  });
});

afterAll(() => {
  act(() => undefined);
});
