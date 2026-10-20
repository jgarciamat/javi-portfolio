/** The «Descargar fichero para la sede» panel. Every person, NIF and figure here is invented. */
import { act, fireEvent, screen, within } from '@testing-library/react';
import { formatMoney } from '@shared/utils/format';
import {
  SEDE_DECLARANT_KEY,
  SedeFiles,
  sedeSourcesOfDraft,
  sedeSourcesOfWithholdings,
  sedeSourcesOfYear,
} from '@modules/finances/ui/components/SedeFiles';
import type {
  PayeeRecord,
  Record347,
  Summary347,
  YearSummary,
} from '@modules/finances/domain/annualSummaries';
import { fromLatin1 } from '@modules/finances/application/aeatFiles/fixedWidth';
import type { SedeSource } from '@modules/finances/application/aeatFiles/models';
import type { Draft349, Draft390, TaxBox } from '@modules/finances/domain/types';
import type { WithholdingResult } from '@modules/finances/domain/withholdings';
import { autonomoDraft } from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

const share = jest.fn(async (..._args: unknown[]) => 'saved');
jest.mock('@shared/utils/shareImage', () => ({
  shareImage: (...args: unknown[]) => share(...args),
}));
const native = jest.fn(() => false);
jest.mock('@shared/utils/platform', () => ({ isNativeApp: () => native() }));

const b = (box: string, amount: number): TaxBox => ({ box, label: box, amount });
const m = (n: number) => formatMoney(n, 'EUR', 'es').replace(/\u00a0/g, ' ');

const m349: Draft349 = {
  required: true,
  monthly: false,
  operators: [{ key: 'S', vatId: 'FR12345678901', name: 'Atelier Inventé', base: 500 }],
  rectifications: [],
  boxes: [],
  warnings: [{ code: 'vs59', expected: 400, got: 500 }],
};
const m390: Draft390 = {
  sections: [{ id: 'prorrata', boxes: [b('115', 1000), b('116', 800), b('118', 80)] }],
  prorrata: 80,
  reconciliation: [],
  warnings: [],
};

const draft = autonomoDraft({
  year: 2026,
  quarter: 4,
  vat: {
    result: 'pay',
    amountDue: 178,
    accrued: [b('07', 1000), b('09', 210), b('27', 210)],
    deductible: [b('29', 32), b('45', 32), b('46', 178)],
    info: [b('59', 500)],
    settlement: [b('66', 178), b('69', 178), b('71', 178)],
  },
  m349,
  m390,
});

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(tr(label)), { target: { value } });

function fillPerson() {
  type('aeatFiles.field.nif', '12345678Z');
  type('aeatFiles.field.surname', 'Pérez Núñez');
  type('aeatFiles.field.name', 'Lucía');
}

/** jsdom has no Blob.arrayBuffer: read it as the browser would. */
const bytesOf = (blob: Blob) =>
  new Promise<Uint8Array>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(blob);
  });

const openPanel = () => fireEvent.click(screen.getByRole('button', { name: tr('aeatFiles.open') }));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  native.mockReturnValue(false);
});

describe('The sources of each screen', () => {
  it('takes the 303, the 130, the 349 and the 390 of a draft when they are filed', () => {
    expect(sedeSourcesOfDraft(draft).map((s) => s.model)).toEqual(['303', '130', '349', '390']);
    const plain = autonomoDraft({ irpf: { ...draft.irpf, required: false } });
    expect(sedeSourcesOfDraft(plain).map((s) => s.model)).toEqual(['303']);
  });

  it('takes the 111 and the 115 when there is something to file', () => {
    const r = (a: 'none' | 'pay', c: 'none' | 'zero') =>
      ({
        quarter: 2,
        m111: { result: a, boxes: [], due: 0, staff: {}, pros: {} },
        m115: { result: c, boxes: [], due: 0, people: 0, base: 0 },
        warnings: [],
      }) as unknown as WithholdingResult;
    expect(sedeSourcesOfWithholdings(r('pay', 'zero'), 2026).map((s) => s.model)).toEqual([
      '111',
      '115',
    ]);
    expect(sedeSourcesOfWithholdings(r('none', 'none'), 2026)).toEqual([]);
  });
});

describe('The panel', () => {
  it('shows nothing without files', () => {
    const { container } = renderWithProviders(<SedeFiles sources={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('warns that Finanverso files nothing and opens the form on the device', () => {
    renderWithProviders(<SedeFiles sources={sedeSourcesOfDraft(draft)} />);
    expect(screen.getByText(tr('aeatFiles.notice'))).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: tr('aeatFiles.open') });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    openPanel();
    expect(screen.getByRole('button', { name: tr('aeatFiles.close') })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByText(tr('aeatFiles.privacy'))).toBeVisible();
    // The 349 asks for a contact, the 390 for the activity and, with prorrata, the CNAE.
    for (const f of ['phone', 'contact', 'activity', 'activityCode', 'iae', 'cnae', 'iban'])
      expect(screen.getByLabelText(tr(`aeatFiles.field.${f}`))).toBeInTheDocument();
    // Nothing typed yet: no file can be written.
    expect(screen.getAllByText(tr('aeatFiles.blocked'))).toHaveLength(4);
    expect(screen.getAllByText(tr('aeatFiles.check.nifMissing'), { exact: false })).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: tr('aeatFiles.close') }));
    expect(screen.getByRole('button', { name: tr('aeatFiles.open') })).toBeInTheDocument();
  });

  it('downloads the 303 in ISO-8859-1 once the person is typed, with its kind and checks', async () => {
    const sources: SedeSource[] = [{ model: '303', draft }];
    renderWithProviders(<SedeFiles sources={sources} />);
    openPanel();
    fillPerson();
    const row = screen.getByRole('heading', { name: tr('aeatFiles.model.303') })
      .parentElement as HTMLElement;
    expect(
      within(row).getByText(tr('aeatFiles.kind', { kind: tr('aeatFiles.kind.I') }))
    ).toBeInTheDocument();
    // Box 59 has intra-EU services and the 349 is there: no warning; only the sums are checked.
    expect(within(row).queryByText(tr('aeatFiles.blocked'))).toBeNull();
    const button = within(row).getByRole('button', {
      name: tr('aeatFiles.download', { file: '12345678Z20264T.303' }),
    });
    await act(async () => fireEvent.click(button));
    expect(share).toHaveBeenCalledTimes(1);
    const [blob, name, label, mode] = share.mock.calls[0] as [Blob, string, string, string];
    expect([name, label, mode]).toEqual([
      '12345678Z20264T.303',
      tr('aeatFiles.model.303'),
      'download',
    ]);
    expect(blob.type).toBe('text/plain;charset=iso-8859-1');
    const text = fromLatin1(await bytesOf(blob));
    expect(text.startsWith('<T303020264T0000><AUX>')).toBe(true);
    expect(text).toContain('PEREZ NUÑEZ LUCIA');
  });

  it('shares the file on a phone and says when it could not be saved', async () => {
    native.mockReturnValue(true);
    share.mockRejectedValueOnce(new Error('no'));
    renderWithProviders(<SedeFiles sources={[{ model: '303', draft }]} />);
    openPanel();
    fillPerson();
    const button = screen.getByRole('button', {
      name: tr('aeatFiles.download', { file: '12345678Z20264T.303' }),
    });
    await act(async () => fireEvent.click(button));
    expect(share.mock.calls[0][3]).toBe('share');
    expect(screen.getByRole('alert')).toHaveTextContent(tr('aeatFiles.error'));
    await act(async () => fireEvent.click(button));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the amounts of a check as money and the 390 needs its activity', () => {
    renderWithProviders(
      <SedeFiles
        sources={[
          { model: '349', draft, m349 },
          { model: '390', draft, m390 },
        ]}
      />
    );
    openPanel();
    fillPerson();
    type('aeatFiles.field.phone', '600000000');
    type('aeatFiles.field.contact', 'Lucía');
    expect(
      screen.getByText(tr('aeatFiles.check.vs59', { expected: m(400), got: m(500) }), {
        exact: false,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: tr('aeatFiles.download', { file: '12345678Z20264T.349' }),
      })
    ).toBeInTheDocument();
    expect(screen.getByText(tr('aeatFiles.check.cnae'), { exact: false })).toBeInTheDocument();
    type('aeatFiles.field.activity', 'Diseño');
    type('aeatFiles.field.activityCode', 'A03');
    type('aeatFiles.field.iae', '844');
    type('aeatFiles.field.cnae', '741');
    fireEvent.click(screen.getByLabelText(tr('aeatFiles.field.thirdParties')));
    expect(screen.getByLabelText(tr('aeatFiles.field.thirdParties'))).toBeChecked();
    expect(
      screen.getByRole('button', {
        name: tr('aeatFiles.download', { file: '12345678Z20260A.390' }),
      })
    ).toBeInTheDocument();
  });

  it('keeps the data on the device only when asked, and reads it back', () => {
    const { unmount } = renderWithProviders(<SedeFiles sources={[{ model: '303', draft }]} />);
    openPanel();
    fillPerson();
    expect(localStorage.getItem(SEDE_DECLARANT_KEY)).toBeNull();
    fireEvent.click(screen.getByLabelText(tr('aeatFiles.remember')));
    expect(JSON.parse(localStorage.getItem(SEDE_DECLARANT_KEY) as string)).toMatchObject({
      nif: '12345678Z',
    });
    unmount();
    renderWithProviders(<SedeFiles sources={[{ model: '303', draft }]} />);
    openPanel();
    expect(screen.getByLabelText(tr('aeatFiles.field.nif'))).toHaveValue('12345678Z');
    expect(screen.getByLabelText(tr('aeatFiles.remember'))).toBeChecked();
    fireEvent.click(screen.getByLabelText(tr('aeatFiles.remember')));
    expect(localStorage.getItem(SEDE_DECLARANT_KEY)).toBeNull();
  });
});

const payee = (over: Partial<PayeeRecord>): PayeeRecord => ({
  nif: '00000000T',
  name: 'Estudio Inventado',
  key: 'G',
  subkey: '01',
  paid: 2000,
  inKind: 0,
  withheld: 300,
  rate: null,
  typed: false,
  ...over,
});
const s190: YearSummary = {
  model: '190',
  records: [payee({}), payee({ typed: true, key: 'A', nif: null, name: '' })],
  boxes: [],
  warnings: [],
};
const s180: YearSummary = {
  model: '180',
  records: [payee({ nif: 'B12345674', name: 'Locales Inventados SL', key: null, rate: 19 })],
  boxes: [],
  warnings: [],
};
const r347: Record347 = {
  key: 'A',
  nif: null,
  name: '',
  total: 4000,
  quarters: [1000, 1000, 1000, 1000],
  premises: false,
  withheld: false,
  reverse: false,
};
const s347: Summary347 = {
  known: true,
  threshold: 3005.06,
  records: [r347],
  boxes: [],
  warnings: [],
  left: 0,
};
const empty347: Summary347 = { ...s347, records: [] };

describe('The yearly informative returns', () => {
  it('offers the 190, the 180 and the 347 when they have records', () => {
    expect(sedeSourcesOfYear(2025, s190, s180, s347).map((s) => s.model)).toEqual([
      '190',
      '180',
      '347',
    ]);
    const none190 = { ...s190, records: [] };
    expect(sedeSourcesOfYear(2025, none190, { ...s180, records: [] }, empty347)).toEqual([]);
  });

  it('asks for the province of each person and the premises of each rent, then writes the 180', () => {
    renderWithProviders(<SedeFiles sources={sedeSourcesOfYear(2025, s190, s180, s347)} />);
    openPanel();
    fillPerson();
    type('aeatFiles.field.phone', '600000000');
    type('aeatFiles.field.contact', 'Lucía');
    type('aeatFiles.field.email', 'lucia@example.test');
    // The 190 has typed totals (no person) and the 347 a record without NIF: no file for them.
    expect(screen.getAllByText(tr('aeatFiles.blocked'))).toHaveLength(3);
    expect(
      screen.getByText(
        `${tr('aeatFiles.records.key.A', { who: '—' })} · ${tr('aeatFiles.records.noNif')}`
      )
    ).toBeInTheDocument();
    const row180 = screen.getByRole('heading', { name: tr('aeatFiles.model.180') })
      .parentElement as HTMLElement;
    const v = within(row180);
    fireEvent.change(v.getByLabelText(tr('aeatFiles.records.province')), {
      target: { value: '28' },
    });
    fireEvent.change(v.getByLabelText(tr('aeatFiles.records.situation')), {
      target: { value: '4' },
    });
    const text = (key: string, value: string) =>
      fireEvent.change(v.getByLabelText(tr(`aeatFiles.records.${key}`)), { target: { value } });
    text('street', 'Calle Inventada');
    text('municipality', 'Madrid');
    text('municipalityCode', '28079');
    text('postcode', '28001');
    fireEvent.change(v.getByLabelText(tr('aeatFiles.records.premisesProvince')), {
      target: { value: '28' },
    });
    expect(
      v.getByRole('button', { name: tr('aeatFiles.download', { file: '12345678Z2025.180' }) })
    ).toBeInTheDocument();
    const row190 = screen.getByRole('heading', { name: tr('aeatFiles.model.190') })
      .parentElement as HTMLElement;
    fireEvent.change(within(row190).getByLabelText(tr('aeatFiles.records.province')), {
      target: { value: '08' },
    });
    expect(
      within(row190).getByText(tr('aeatFiles.check.typed190', { key: 'A' }), { exact: false })
    ).toBeInTheDocument();
  });

  it('asks nothing per record when there are only typed totals', () => {
    const typed = { ...s190, records: [s190.records[1]] };
    renderWithProviders(<SedeFiles sources={[{ model: '190', year: 2025, summary: typed }]} />);
    openPanel();
    expect(screen.queryByText(tr('aeatFiles.records.title', { n: 1 }))).toBeNull();
  });

  it('names the sales of the 347 and a person with a NIF', () => {
    const sale = { ...r347, key: 'B' as const, nif: '00000000T', name: 'Cliente' };
    renderWithProviders(
      <SedeFiles
        sources={sedeSourcesOfYear(
          2025,
          { ...s190, records: [] },
          { ...s180, records: [] },
          { ...s347, records: [sale] }
        )}
      />
    );
    openPanel();
    expect(
      screen.getByText(`${tr('aeatFiles.records.key.B', { who: 'Cliente' })} · 00000000T`)
    ).toBeInTheDocument();
  });
});
