import { useState } from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { strToU8 } from 'fflate';
import { emptyForm, type RentaForm } from '@modules/tools/domain/rentaForm';
import { emptySavingsDetail, type ImportedSavings } from '@modules/tools/domain/rentaGains';
import { RentaPlanner } from '@modules/tools/ui/RentaPlanner';
import {
  INVEST_CARD_ID,
  InvestCard,
  InvestLink,
  importedSummary,
} from '@modules/tools/ui/renta/InvestCard';
import { SavingsDetailSection } from '@modules/tools/ui/renta/SavingsDetail';
import { reveal } from '@modules/tools/ui/renta/shared';
import { renderWithProviders, tr } from '@test-utils/render';

jest.mock('@modules/tools/application/readPdf', () => ({ readPdf: jest.fn() }));

const k = 'tools.renta.investCard';
const fileOf = (name: string, content: string): File => {
  const data = new Uint8Array(strToU8(content)).buffer as ArrayBuffer;
  return Object.assign(new File([data], name), {
    arrayBuffer: async () => data,
    text: async () => content,
  });
};
// Invented operations: 0.1 BTC bought for 3,003 €, then two sales.
const BINANCE = `Date(UTC),Pair,Side,Price,Executed,Amount,Fee
2024-03-01 10:00:00,BTCEUR,BUY,30000,0.1BTC,3000EUR,3EUR
2025-03-01 10:00:00,BTCEUR,SELL,40000,0.05BTC,2000EUR,2EUR
2025-05-01 10:00:00,BTCEUR,SELL,20000,0.01BTC,200EUR,0EUR`;

/** Two sales of one asset in two years: a gain in 2024 and a loss in 2025. */
const IMPORTED: ImportedSavings = {
  files: ['broker.csv'],
  capital: { interest: 0, dividends: 0, assets: 0, insurance: 0, expenses: 0 },
  assets: [
    {
      name: 'Fondo Ficticio',
      kind: 'fund',
      buys: [{ date: '2023-01-10', units: 10, cost: 1000 }],
      sells: [
        { date: '2025-02-01', units: 5, proceeds: 400 },
        { date: '2024-02-01', units: 5, proceeds: 700 },
      ],
    },
  ],
  generalGains: [],
  otherGains: [],
  withheld: { capital: 0, gains: 0 },
  foreignTax: [],
} as ImportedSavings;

function Harness({ initial }: { initial: Partial<RentaForm> }) {
  const [form, setForm] = useState<RentaForm>({ ...emptyForm(''), ...initial });
  return (
    <>
      <InvestCard form={form} set={(patch) => setForm((f) => ({ ...f, ...patch }))} />
      <p data-testid="answers">{JSON.stringify(form.answers)}</p>
      <p data-testid="assets">{form.savingsDetail?.imported?.assets.length ?? 'none'}</p>
    </>
  );
}

beforeEach(() => localStorage.clear());

describe('«My investments»: a card of its own', () => {
  it('sums up what was imported: files, operations and the result of each year', () => {
    expect(importedSummary(IMPORTED)).toEqual({
      files: ['broker.csv'],
      assets: 1,
      operations: 3,
      // FIFO: 5 units at 100 € each. 2024: 700 − 500; 2025: 400 − 500.
      years: [
        { year: '2024', gain: 200 },
        { year: '2025', gain: -100 },
      ],
    });
  });

  it('shows the drop area and the big button straight away, and takes the files to the Renta', async () => {
    renderWithProviders(<Harness initial={{}} />, { authenticated: false });
    expect(screen.getByRole('heading', { name: tr(`${k}.title`) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: tr('tools.invest.choose') })).toBeInTheDocument();
    const input = screen.getByLabelText(tr('tools.invest.file')) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [fileOf('binance.csv', BINANCE)] } });
    });
    fireEvent.click(screen.getByRole('button', { name: tr('tools.invest.apply') }));
    expect(screen.getByTestId('assets')).toHaveTextContent('1');
    // Importing answers the question of the savings too.
    expect(screen.getByTestId('answers')).toHaveTextContent('"savings":"yes"');
    expect(
      screen.getByText(tr(`${k}.imported`, { files: 'binance.csv', operations: 3, assets: 1 }))
    ).toBeInTheDocument();
  });

  it('shows the gains and losses by year, takes them out and opens the importer again', () => {
    renderWithProviders(
      <Harness initial={{ savingsDetail: { ...emptySavingsDetail(), imported: IMPORTED } }} />,
      { authenticated: false }
    );
    expect(screen.queryByRole('button', { name: tr('tools.invest.choose') })).toBeNull();
    expect(screen.getByText(tr(`${k}.gainYear`, { year: '2024' })).nextSibling).toHaveTextContent(
      '200,00'
    );
    expect(screen.getByText(tr(`${k}.lossYear`, { year: '2025' })).nextSibling).toHaveTextContent(
      '100,00'
    );
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.again`) }));
    expect(screen.getByRole('button', { name: tr('tools.invest.choose') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('tools.invest.remove') }));
    expect(screen.getByTestId('assets')).toHaveTextContent('none');
  });

  it('lists no years when nothing was sold', () => {
    renderWithProviders(
      <Harness
        initial={{
          savingsDetail: {
            ...emptySavingsDetail(),
            imported: { ...IMPORTED, assets: [{ ...IMPORTED.assets[0], sells: [] }] },
          },
        }}
      />,
      { authenticated: false }
    );
    expect(screen.queryByText(tr(`${k}.gainYear`, { year: '2024' }))).toBeNull();
  });
});

describe('the ways to the card', () => {
  it('scrolls to the card of the page and puts the focus there', () => {
    renderWithProviders(
      <>
        <InvestLink form={emptyForm('')} />
        <section id={INVEST_CARD_ID} tabIndex={-1}>
          card
        </section>
      </>,
      { authenticated: false }
    );
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.linkButton`) }));
    expect(document.getElementById(INVEST_CARD_ID)).toHaveFocus();
  });

  it('is not offered once there are investments', () => {
    renderWithProviders(
      <InvestLink
        form={{ ...emptyForm(''), savingsDetail: { ...emptySavingsDetail(), imported: IMPORTED } }}
      />,
      { authenticated: false }
    );
    expect(screen.queryByRole('button', { name: tr(`${k}.linkButton`) })).toBeNull();
  });

  it('replaces the importer of the savings detail where the card is on the page', () => {
    const onImport = jest.fn();
    renderWithProviders(
      <SavingsDetailSection
        form={emptyForm('')}
        set={jest.fn()}
        importer={false}
        onImport={onImport}
      />,
      { authenticated: false }
    );
    expect(screen.queryByRole('button', { name: tr('tools.invest.open') })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr(`${k}.linkButton`) }));
    expect(onImport).toHaveBeenCalled();
  });

  it('puts the card first among the deductions of the expert screen, linked from the result', () => {
    localStorage.setItem('mm_renta_view', 'expert');
    renderWithProviders(<RentaPlanner mode="local" />, { authenticated: false });
    const card = document.getElementById(INVEST_CARD_ID) as HTMLElement;
    const deductions = screen.getByRole('heading', { name: /Tus deducciones/ }).parentElement;
    expect(deductions).toContainElement(card);
    const links = screen.getAllByRole('button', { name: tr(`${k}.linkButton`) });
    fireEvent.click(links[links.length - 1]);
    expect(card).toHaveFocus();
  });

  it('does nothing when the result is not on the page (the assistant)', () => {
    expect(() => reveal(null)).not.toThrow();
  });
});
