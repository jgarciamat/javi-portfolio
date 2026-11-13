import { act, fireEvent, screen, within } from '@testing-library/react';
import { track } from '@core/analytics';
import { tokenStore } from '@core/api/http';
import * as renta from '@modules/tools/data/renta';
import { GUIDES } from '@modules/guides/domain/guides';
import {
  TOOL_PAGES,
  faqOf,
  guidesOfTool,
  isOpenTool,
  toolPage,
} from '@modules/tools/domain/toolPages';
import { SalaryCalculatorPage } from '@modules/tools/ui/SalaryCalculator';
import { RetaCalculatorPage } from '@modules/tools/ui/RetaCalculator';
import { renderWithProviders, tr } from '@test-utils/render';

const field = (key: string) => screen.getByLabelText(tr(key));
const change = (key: string, value: string) => fireEvent.change(field(key), { target: { value } });
const card = (key: string) =>
  screen.getByRole('heading', { name: tr(key) }).closest('section') as HTMLElement;
const row = (label: string | RegExp) =>
  screen.getByRole('rowheader', { name: label }).closest('tr') as HTMLElement;
/** Amounts as the page writes them: 1.628,50 € (with a narrow space or not). */
const euros = (text: string) => new RegExp(`^${text.replace(/\./g, '\\.')}\\s?€$`);

jest.mock('@core/analytics', () => ({
  ...jest.requireActual('@core/analytics'),
  track: jest.fn(),
}));

afterEach(() => jest.restoreAllMocks());

describe('toolPages helpers', () => {
  it('joins the guides that link to a calculator and the ones it names, once', () => {
    const iva = guidesOfTool('/calculadora-iva');
    expect(iva.length).toBeGreaterThan(0);
    expect(iva.every((g) => g.tool?.to === '/calculadora-iva')).toBe(true);
    expect(guidesOfTool('/calculadora-cuota-autonomos').map((g) => g.slug)).toContain(
      'cuota-autonomos-2026-por-tramos'
    );
    // A named guide that also links to the calculator is listed once; unknown slugs are skipped.
    const linked = GUIDES.find((g) => g.tool)!;
    const named = { ...linked, tool: { to: '/calculadora-sueldo-neto', label: 'x' } };
    const others = GUIDES.filter((g) => g.slug !== linked.slug);
    expect(
      guidesOfTool('/calculadora-sueldo-neto', [named, ...others]).filter(
        (g) => g.slug === linked.slug
      )
    ).toHaveLength(1);
    expect(guidesOfTool('/no-such-tool')).toEqual([]);
    expect(guidesOfTool('/calculadora-sueldo-neto', [])).toEqual([]);
  });

  it('numbers the questions of each calculator', () => {
    expect(faqOf(toolPage('/calculadora-sueldo-neto'))).toEqual([1, 2, 3, 4]);
    expect(faqOf(toolPage('/calculadora-iva'))).toEqual([]);
    expect(faqOf(undefined)).toEqual([]);
    expect(TOOL_PAGES.map((p) => p.key)).toEqual(expect.arrayContaining(['salary', 'reta']));
  });

  it('opens only the net salary and the self-employed contribution calculators', () => {
    expect(TOOL_PAGES.filter((p) => isOpenTool(p.path)).map((p) => p.key)).toEqual([
      'salary',
      'reta',
    ]);
    expect(isOpenTool('/no-such-tool')).toBe(false);
  });
});

describe('net salary calculator', () => {
  it('shows the net pay of the example, the breakdown, the questions and the sources', () => {
    renderWithProviders(<SalaryCalculatorPage />, { authenticated: true });
    expect(document.title).toBe(tr('tools.salary.title'));
    // 30.000 € in 14 payments, single: see salaryCalc.test.ts for the arithmetic.
    expect(within(card('tools.salary.monthly')).getByText(euros('1.628,50'))).toBeInTheDocument();
    expect(
      within(card('tools.salary.monthly')).getByText(/En las 2 extra cobras 1\.791,00\s?€/)
    ).toBeInTheDocument();
    expect(within(card('tools.salary.yearly')).getByText(euros('23.124,00'))).toBeInTheDocument();
    expect(within(card('tools.salary.irpf')).getByText('16,42 %')).toBeInTheDocument();
    expect(within(row(/Contingencias comunes/)).getByText(euros('1.410,00'))).toBeInTheDocument();
    expect(within(row(tr('tools.salary.row.base2'))).getByText(euros('26.050,00'))).toBeTruthy();
    expect(screen.queryByText(tr('tools.salary.row.solidarity'))).toBeNull();
    expect(screen.getByText(tr('tools.salary.renta.choose'))).toBeInTheDocument();
    // Visible questions and the same ones for search engines.
    expect(screen.getByText(tr('tools.salary.faq1.q'))).toBeInTheDocument();
    const ld = document.querySelector('script[type="application/ld+json"]') as HTMLElement;
    const faq = JSON.parse(ld.innerHTML);
    expect(faq['@type']).toBe('FAQPage');
    expect(faq.mainEntity[3].name).toBe(tr('tools.salary.faq4.q'));
    expect(screen.getByRole('link', { name: tr('tools.salary.source2') })).toHaveAttribute(
      'href',
      expect.stringContaining('agenciatributaria')
    );
    expect(screen.getByText(/18 de octubre de 2026/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: tr('wall.title') })).toBeNull();
    expect(
      screen.getByRole('link', {
        name: GUIDES.find((g) => g.slug === 'como-leer-borrador-renta')!.title,
      })
    ).toHaveAttribute('href', '/guias/como-leer-borrador-renta');
  });

  it('recalculates with each field and explains the special cases', () => {
    renderWithProviders(<SalaryCalculatorPage />, { authenticated: true });
    change('tools.salary.payments', '12');
    expect(within(card('tools.salary.monthly')).getByText(euros('1.927,00'))).toBeInTheDocument();
    expect(screen.getByText(tr('tools.salary.monthlyHint12'))).toBeInTheDocument();

    change('tools.salary.gross', '15000');
    expect(screen.getByText(/no se retiene IRPF/)).toBeInTheDocument();

    change('tools.salary.gross', '17094');
    expect(screen.getByText(tr('tools.salary.note.capped'))).toBeInTheDocument();
    expect(within(card('tools.salary.irpf')).getByText('3,06 %')).toBeInTheDocument();

    change('tools.salary.gross', '16000');
    change('tools.salary.contract', 'short');
    expect(screen.getByText(tr('tools.salary.note.minimumRate'))).toBeInTheDocument();
    expect(within(row('Desempleo (1,6 %)')).getByText(euros('255,96'))).toBeTruthy();

    change('tools.salary.contract', 'indefinite');
    change('tools.salary.gross', '90000');
    expect(screen.getByText(tr('tools.salary.note.solidarity'))).toBeInTheDocument();
    expect(row(tr('tools.salary.row.solidarity'))).toBeInTheDocument();

    change('tools.salary.gross', '40000');
    change('tools.salary.situation', '1');
    change('tools.salary.children', '3');
    change('tools.salary.under3', '1');
    change('tools.salary.age', '40');
    expect(within(card('tools.salary.irpf')).getByText('12,59 %')).toBeInTheDocument();
    expect(row(tr('tools.salary.row.childrenReduction'))).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(tr('tools.salary.shared')));
    change('tools.salary.disability', '65');
    expect(within(row(tr('tools.salary.row.otherExpenses'))).getByText(/9\.750,00/)).toBeTruthy();
  });

  it('estimates the tax return of the chosen community', async () => {
    renderWithProviders(<SalaryCalculatorPage />, { authenticated: true });
    change('tools.salary.ccaa', 'ceuta');
    expect(screen.getByText(tr('tools.salary.renta.loading'))).toBeInTheDocument();
    // Ceuta uses the default regional scale: the return matches the withholding.
    expect(await screen.findByText(/Te devolverían unos 0,00\s?€/)).toBeInTheDocument();
    expect(row(/Cuota autonómica \(Ceuta\)/)).toBeInTheDocument();
    expect(screen.getByText(tr('tools.salary.renta.note'))).toBeInTheDocument();

    // With three children the withholding takes 600 € off the base the return does not.
    change('tools.salary.gross', '40000');
    change('tools.salary.situation', '1');
    change('tools.salary.children', '3');
    change('tools.salary.under3', '1');
    expect(screen.getByText(/Te saldría a pagar unos 197,98\s?€/)).toBeInTheDocument();

    change('tools.salary.gross', '17094');
    change('tools.salary.situation', '3');
    change('tools.salary.children', '0');
    change('tools.salary.under3', '0');
    change('tools.salary.payments', '12');
    expect(row(tr('tools.salary.renta.smi'))).toBeInTheDocument();
    expect(screen.getByText(/Te devolverían unos 523,07\s?€/)).toBeInTheDocument();

    change('tools.salary.ccaa', 'navarra');
    expect(await screen.findByText(tr('tools.salary.renta.foral'))).toBeInTheDocument();
    change('tools.salary.ccaa', '');
    expect(screen.getByText(tr('tools.salary.renta.choose'))).toBeInTheDocument();
  });

  it('says so when the community cannot be loaded, and ignores late answers', async () => {
    const spy = jest.spyOn(renta, 'loadCcaa').mockRejectedValueOnce(new Error('offline'));
    const { unmount } = renderWithProviders(<SalaryCalculatorPage />, { authenticated: true });
    change('tools.salary.ccaa', 'madrid');
    expect(await screen.findByText(tr('tools.salary.renta.error'))).toBeInTheDocument();

    // A community chosen and replaced (or the page closed) before it loads is never shown.
    let resolve: (v: Awaited<ReturnType<typeof renta.loadCcaa>>) => void = () => undefined;
    let reject: (e: Error) => void = () => undefined;
    spy
      .mockImplementationOnce(() => new Promise((ok) => (resolve = ok)))
      .mockImplementationOnce(() => new Promise((_, ko) => (reject = ko)));
    change('tools.salary.ccaa', 'galicia');
    change('tools.salary.ccaa', 'aragon');
    unmount();
    await act(async () => {
      resolve({ id: 'galicia', name: 'Galicia', regime: 'common', deductions: [], source: '' });
      reject(new Error('late'));
    });
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('speaks English on the English page', () => {
    renderWithProviders(<SalaryCalculatorPage />, { authenticated: true, locale: 'en' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Spain net salary calculator 2026'
    );
    expect(screen.getAllByText('16.42 %').length).toBeGreaterThan(0);
    expect(screen.getByText(/18 October 2026/)).toBeInTheDocument();
  });
});

describe('self-employed contribution calculator', () => {
  it('shows the bracket, the bases and the fee of the example', () => {
    renderWithProviders(<RetaCalculatorPage />, { authenticated: true });
    expect(document.title).toBe(tr('tools.reta.title'));
    // 2.000 € − 7 % = 1.860 € → G5: from 380,88 € to 639,45 €.
    expect(within(card('tools.reta.fee')).getByText(euros('380,88'))).toBeInTheDocument();
    expect(within(card('tools.reta.bracket')).getByText('General 5')).toBeInTheDocument();
    expect(
      within(card('tools.reta.bases')).getByText(/1\.209,15\s?€ – 2\.030,00\s?€/)
    ).toBeTruthy();
    expect(within(row(/Gastos genéricos \(7 %\)/)).getByText(/140,00/)).toBeTruthy();
    expect(within(row(tr('tools.reta.row.rate'))).getByText(/= 31,5 %$/)).toBeTruthy();
    // The table marks the bracket and says where each one ends.
    const current = document.querySelector('.tools-row-current') as HTMLElement;
    expect(within(current).getByText('G5')).toBeInTheDocument();
    expect(screen.getByText(/Menos de 1\.166,70/)).toBeInTheDocument();
    expect(screen.getByText(/Más de 6\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(tr('tools.reta.faq2.q'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: tr('tools.reta.source1') })).toHaveAttribute(
      'href',
      expect.stringContaining('BOE-A-2026-7296')
    );
  });

  it('works from the yearly figures, for company partners and with the flat rate', () => {
    renderWithProviders(<RetaCalculatorPage />, { authenticated: true });
    change('tools.reta.mode', 'yearly');
    change('tools.reta.income', '18000');
    change('tools.reta.expenses', '6000');
    // (18.000 − 6.000) / 12 = 1.000 − 7 % = 930 → R3.
    expect(within(card('tools.reta.bracket')).getByText('Reducido 3')).toBeInTheDocument();
    change('tools.reta.person', 'company');
    expect(within(row(/Gastos genéricos \(3 %\)/)).getByText(/30,00/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText(tr('tools.reta.flatRate')));
    expect(within(card('tools.reta.fee')).getByText(euros('80,00'))).toBeInTheDocument();
    expect(screen.getByText(tr('tools.reta.extension'))).toBeInTheDocument();
    change('tools.reta.mode', 'monthly');
    change('tools.reta.monthlyNet', '-300');
    expect(within(card('tools.reta.bracket')).getByText('Reducido 1')).toBeInTheDocument();
  });

  it('speaks English on the English page', () => {
    renderWithProviders(<RetaCalculatorPage />, { authenticated: true, locale: 'en' });
    expect(screen.getByText('General 5')).toBeInTheDocument();
    expect(screen.getByText(/= 31.5 %$/)).toBeInTheDocument();
  });
});

describe('tax calculators for visitors without an account', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.mocked(track).mockClear();
  });

  const OPEN = [
    [SalaryCalculatorPage, 'salary', 'tools.salary.gross', '/calculadora-sueldo-neto'],
    [RetaCalculatorPage, 'reta', 'tools.reta.monthlyNet', '/calculadora-cuota-autonomos'],
  ] as const;

  it.each(OPEN)(
    '%p shows the form, the result and the answers; the breakdown asks for an account',
    (Page, key, field, path) => {
      renderWithProviders(<Page />, { authenticated: false, route: path });
      expect(
        screen.getByRole('heading', { level: 1, name: tr(`tools.${key}.title`) })
      ).toBeVisible();
      expect(screen.getByLabelText(tr(field))).toBeInTheDocument();
      expect(screen.getByText(tr(`tools.${key}.disclaimer`))).toBeInTheDocument();
      for (const n of [1, 2, 3, 4]) {
        expect(screen.getByText(tr(`tools.${key}.faq${n}.a`))).toBeInTheDocument();
      }
      const ld = document.querySelector('script[type="application/ld+json"]') as HTMLElement;
      expect(JSON.parse(ld.innerHTML)['@type']).toBe('FAQPage');
      // The breakdown: only its titles, then the invitation with the calculator's own words.
      expect(screen.queryByRole('table')).toBeNull();
      const outline = screen
        .getByRole('heading', { name: tr('tools.open.outline') })
        .closest('section') as HTMLElement;
      expect(within(outline).getAllByRole('listitem').length).toBeGreaterThan(1);
      expect(screen.getByRole('heading', { name: tr(`tools.${key}.cta.title`) })).toBeVisible();
      expect(screen.getByText(tr(`tools.${key}.cta.lead`))).toBeVisible();
      expect(screen.queryByText(tr('wall.kicker.tool'))).toBeNull();
      expect(screen.getByRole('link', { name: tr('wall.register') })).toHaveAttribute(
        'href',
        `/login?mode=register&next=${encodeURIComponent(path)}`
      );
      expect(screen.getByRole('link', { name: tr('wall.login') })).toHaveAttribute(
        'href',
        `/login?next=${encodeURIComponent(path)}`
      );
    }
  );

  it('shows the net pay of the example without an account', () => {
    renderWithProviders(<SalaryCalculatorPage />, { authenticated: false });
    expect(within(card('tools.salary.monthly')).getByText(euros('1.628,50'))).toBeInTheDocument();
    expect(screen.queryByText(tr('tools.salary.renta.choose'))).toBeNull();
    expect(screen.queryByRole('rowheader', { name: /Contingencias comunes/ })).toBeNull();
  });

  it('counts the first result worked out and the click to sign up, never the figures', () => {
    renderWithProviders(<SalaryCalculatorPage />, { authenticated: false });
    expect(track).not.toHaveBeenCalled();
    change('tools.salary.gross', '42000');
    change('tools.salary.age', '50');
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('calc_result', { detail: 'salary' });
    fireEvent.click(screen.getByRole('link', { name: tr('wall.register') }));
    expect(track).toHaveBeenLastCalledWith('calc_cta_click', { detail: 'salary' });
    expect(JSON.stringify(jest.mocked(track).mock.calls)).not.toContain('42000');
    // The figures wait in this tab for when the person comes back with an account.
    expect(JSON.parse(sessionStorage.getItem('mm_calc_draft:salary') as string)).toMatchObject({
      gross: '42000',
      age: '50',
    });
  });

  it('keeps the figures on «I have an account» too, and picks them up after signing in', () => {
    const view = renderWithProviders(<RetaCalculatorPage />, { authenticated: false });
    change('tools.reta.monthlyNet', '3100');
    fireEvent.click(screen.getByRole('link', { name: tr('wall.login') }));
    expect(track).not.toHaveBeenCalledWith('calc_cta_click', expect.anything());
    view.unmount();
    jest.mocked(track).mockClear();

    renderWithProviders(<RetaCalculatorPage />, { authenticated: true });
    expect(screen.getByLabelText(tr('tools.reta.monthlyNet'))).toHaveValue('3100');
    expect(screen.getAllByRole('table')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: tr('tools.reta.howTitle') })).toBeVisible();
    expect(sessionStorage.getItem('mm_calc_draft:reta')).toBeNull();
    // With an account nothing is counted.
    change('tools.reta.monthlyNet', '3200');
    expect(track).not.toHaveBeenCalledWith('calc_result', expect.anything());
  });

  it('shows neither the breakdown nor its titles while a stored session is being restored', () => {
    tokenStore.setSession('expired.token.x', 'refresh-token');
    renderWithProviders(<SalaryCalculatorPage />, { authenticated: false });
    expect(screen.getByLabelText(tr('tools.salary.gross'))).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(tr('wall.checking'));
    expect(screen.queryByRole('heading', { name: tr('tools.open.outline') })).toBeNull();
    tokenStore.clear();
  });

  it('starts from the example when this tab cannot keep anything', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    const original = window.sessionStorage;
    Object.defineProperty(window, 'sessionStorage', {
      value: { getItem: blocked, setItem: blocked, removeItem: blocked },
      configurable: true,
    });
    try {
      const view = renderWithProviders(<RetaCalculatorPage />, { authenticated: false });
      change('tools.reta.monthlyNet', '3100');
      fireEvent.click(screen.getByRole('link', { name: tr('wall.register') }));
      view.unmount();
      renderWithProviders(<RetaCalculatorPage />, { authenticated: true });
      expect(screen.getByLabelText(tr('tools.reta.monthlyNet'))).toHaveValue('2000');
    } finally {
      Object.defineProperty(window, 'sessionStorage', { value: original, configurable: true });
    }
  });
});
